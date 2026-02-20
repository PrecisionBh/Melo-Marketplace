import * as ImagePicker from "expo-image-picker"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { notify } from "@/lib/notifications/notify"
import { useAuth } from "../../../../context/AuthContext"
import { handleAppError } from "../../../../lib/errors/appError"
import { supabase } from "../../../../lib/supabase"

const REASONS = [
  "Item not received",
  "Item not as described",
  "Item arrived damaged",
  "Seller unresponsive",
  "Other",
]

export default function DisputeIssuePage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()
  const user = session?.user

  const [reason, setReason] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  if (!id || !user) {
    return null
  }

  /* ---------------- IMAGE PICKER ---------------- */

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      })

      if (!result.canceled && result.assets[0]?.uri) {
        setImages((prev) => [...prev, result.assets[0].uri])
      }
    } catch (err) {
      handleAppError(err, {
        context: "dispute_image_pick",
        fallbackMessage: "Failed to select image.",
      })
    }
  }

  /* ---------------- UPLOAD EVIDENCE (BUYER SAFE) ---------------- */

  const uploadEvidenceImages = async (disputeId: string) => {
    const uploadedUrls: string[] = []

    for (const uri of images) {
      const response = await fetch(uri)
      const blob = await response.blob()
      const filename = `buyer-${Date.now()}-${Math.random()}.jpg`
      const path = `${disputeId}/${filename}`

      const { error } = await supabase.storage
        .from("dispute-images")
        .upload(path, blob, {
          contentType: "image/jpeg",
          upsert: false,
        })

      if (error) throw error

      const { data } = supabase.storage
        .from("dispute-images")
        .getPublicUrl(path)

      if (data?.publicUrl) {
        uploadedUrls.push(data.publicUrl)
      }
    }

    return uploadedUrls
  }

  /* ---------------- SUBMIT DISPUTE (HARDENED DB FLOW) ---------------- */

  const submitDispute = async () => {
    if (!reason || !description.trim()) {
      Alert.alert(
        "Missing info",
        "Please select a reason and add a description."
      )
      return
    }

    try {
      setSubmitting(true)

      /* 1️⃣ Fetch order + validate ownership + lifecycle */
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, buyer_id, seller_id, status, is_disputed")
        .eq("id", id)
        .single()

      if (orderError || !order) throw orderError

      // 🔒 Security: must be the buyer
      if (order.buyer_id !== user.id) {
        Alert.alert("Access denied", "You cannot dispute this order.")
        return
      }

      // 🔒 Lifecycle enforcement (your rule: no disputes after complete)
      if (order.status === "completed" || order.status === "cancelled") {
        Alert.alert(
          "Dispute Not Allowed",
          "This order is already finalized and cannot be disputed."
        )
        return
      }

      /* 2️⃣ Prevent duplicate disputes */
      const { data: existingDispute } = await supabase
        .from("disputes")
        .select("id, status")
        .eq("order_id", id)
        .not("status", "in", "(resolved_buyer,resolved_seller,closed)")
        .maybeSingle()

      if (existingDispute) {
        Alert.alert(
          "Dispute Already Open",
          "There is already an active dispute for this order."
        )
        return
      }

      /* 3️⃣ Insert dispute (aligned with your schema + flow) */
const { data: dispute, error: disputeError } = await supabase
  .from("disputes")
  .insert({
    order_id: id,
    buyer_id: user.id,
    seller_id: order.seller_id,
    opened_by: "buyer",
    reason,
    description: description.trim(),
    status: "issue_open",
    created_at: new Date().toISOString(),
  })
  .select()
  .single()

if (disputeError || !dispute) throw disputeError

/* 4️⃣ Upload buyer evidence (FORMDATA — MATCHES LISTING UPLOAD + ROLLBACK SAFE) */
if (images.length > 0) {
  try {
    const evidenceUrls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const uri = images[i]
      const ext = uri.split(".").pop() || "jpg"
      const path = `${dispute.id}/buyer-${i}.${ext}`

      const formData = new FormData()
      formData.append("file", {
        uri,
        name: path,
        type: `image/${ext === "jpg" ? "jpeg" : ext}`,
      } as any)

      const { error: uploadError } = await supabase.storage
        .from("dispute-images")
        .upload(path, formData, { upsert: false })

      if (uploadError) {
        // 🚨 CRITICAL: DELETE DISPUTE IF EVIDENCE FAILS (NO PARTIAL ROWS)
        await supabase
          .from("disputes")
          .delete()
          .eq("id", dispute.id)
          .eq("buyer_id", user.id)

        handleAppError(uploadError, {
          context: "dispute_storage_upload",
          fallbackMessage:
            "Failed to upload dispute evidence. Dispute was not created.",
        })
        throw uploadError
      }

      const { data } = supabase.storage
        .from("dispute-images")
        .getPublicUrl(path)

      if (data?.publicUrl) {
        evidenceUrls.push(data.publicUrl)
      }
    }

    // 🔥 SAVE URLs TO DISPUTE (FIXES NULL EVIDENCE ISSUE)
    if (evidenceUrls.length > 0) {
      const { error: updateEvidenceError } = await supabase
        .from("disputes")
        .update({
          buyer_evidence_urls: evidenceUrls,
        })
        .eq("id", dispute.id)
        .eq("buyer_id", user.id) // RLS safe

      if (updateEvidenceError) {
        // 🚨 CRITICAL: ROLLBACK DISPUTE IF DB UPDATE FAILS
        await supabase
          .from("disputes")
          .delete()
          .eq("id", dispute.id)
          .eq("buyer_id", user.id)

        handleAppError(updateEvidenceError, {
          context: "dispute_update_evidence",
          fallbackMessage:
            "Failed to attach evidence. Dispute was not created.",
        })
        throw updateEvidenceError
      }
    }
  } catch (err) {
    // Extra safety rollback (network / storage / unknown errors)
    await supabase
      .from("disputes")
      .delete()
      .eq("id", dispute.id)
      .eq("buyer_id", user.id)

    throw err
  }
}

      /* 5️⃣ Flag order as disputed (TRIGGERS ESCROW FREEZE) */
      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({
          is_disputed: true,
          status: "disputed", // aligns with your lifecycle
        })
        .eq("id", id)
        .eq("buyer_id", user.id)

      if (orderUpdateError) throw orderUpdateError

      /* 6️⃣ Notify seller (using unified Melo system) */
      try {
        await notify({
          userId: order.seller_id,
          type: "order",
          title: "Dispute Opened",
          body:
            "A buyer has opened a dispute on an order. Please review and respond with evidence.",
          data: {
            route: "/seller-hub/orders/[id]",
            params: { id },
          },
        })
      } catch (notifyErr) {
        console.warn("Dispute notification failed:", notifyErr)
      }

      Alert.alert(
        "Dispute Submitted",
        "Your dispute has been submitted. Escrow is now frozen while this issue is reviewed."
      )

      router.replace("/buyer-hub/orders")
    } catch (err) {
      handleAppError(err, {
        context: "buyer_dispute_submit",
        fallbackMessage:
          "Unable to submit dispute. Please try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.screen}>
      <AppHeader
  title="File a Dispute"
  backRoute="/buyer-hub/orders"
/>


      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.orderRef}>
          Order #{id.slice(0, 8)}
        </Text>

        <Text style={styles.label}>Reason</Text>
        {REASONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              styles.reasonBtn,
              reason === r && styles.reasonSelected,
            ]}
            onPress={() => setReason(r)}
          >
            <Text
              style={[
                styles.reasonText,
                reason === r && styles.reasonTextSelected,
              ]}
            >
              {r}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>Describe the issue</Text>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Explain what went wrong..."
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Upload evidence (optional)</Text>
        <View style={styles.imageRow}>
          {images.map((uri, idx) => (
            <Image key={idx} source={{ uri }} style={styles.previewImage} />
          ))}

          <TouchableOpacity style={styles.addImage} onPress={pickImage}>
            <Text style={styles.addImageText}>＋</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={submitDispute}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit Dispute</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F7F8" },
  header: {
    height: 90,
    backgroundColor: "#E8F5EE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D1E9DD",
  },
  backBtn: { width: 32, alignItems: "flex-start" },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F7A63",
  },
  container: { padding: 16, paddingBottom: 32 },
  orderRef: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 6,
  },
  reasonBtn: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#E9ECEF",
    marginBottom: 8,
  },
  reasonSelected: { backgroundColor: "#1F7A63" },
  reasonText: { color: "#000" },
  reasonTextSelected: { color: "#fff" },
  textArea: {
    minHeight: 120,
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 12,
    textAlignVertical: "top",
  },
  imageRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  addImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
    backgroundColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  addImageText: { fontSize: 32, color: "#374151" },
  submitBtn: {
    marginTop: 22,
    backgroundColor: "#1F7A63",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
