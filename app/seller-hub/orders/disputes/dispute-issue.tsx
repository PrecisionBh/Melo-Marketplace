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
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

const REASONS = [
  "Item not returned",
  "Returned item damaged",
  "Wrong item returned",
  "Return abuse / fraud",
  "Other",
]

export default function SellerDisputeIssuePage() {
  const { id } = useLocalSearchParams<{ id: string }>() // order id
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
        fallbackMessage: "Failed to open image picker.",
      })
    }
  }

  /* ---------------- UPLOAD EVIDENCE ---------------- */

  const uploadEvidenceImages = async (disputeId: string) => {
    const uploadedUrls: string[] = []

    for (const uri of images) {
      const response = await fetch(uri)
      const blob = await response.blob()
      const filename = `${Date.now()}-${Math.random()}.jpg`
      const path = `${disputeId}/seller-${filename}`

      const { error } = await supabase.storage
        .from("dispute-images")
        .upload(path, blob, { contentType: "image/jpeg" })

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

  /* ---------------- SUBMIT DISPUTE (SELLER SIDE) ---------------- */

  const submitDispute = async () => {
    if (!reason || !description.trim()) {
      Alert.alert(
        "Missing info",
        "Please select a reason and provide a description."
      )
      return
    }

    if (submitting) return

    try {
      setSubmitting(true)

      /* -------- FETCH ORDER + STRICT LIFECYCLE CHECK -------- */
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("buyer_id, seller_id, status, is_disputed")
        .eq("id", id)
        .single()

      if (orderError || !order) throw orderError

      // 🔐 Ensure current user is the seller
      if (order.seller_id !== user.id) {
        Alert.alert("Access denied", "You are not authorized for this order.")
        setSubmitting(false)
        return
      }

      // 🚨 CRITICAL: ONLY allow dispute during return_started
      if (order.status !== "return_started") {
        Alert.alert(
          "Dispute Not Available",
          "Seller disputes can only be opened while a return is in progress."
        )
        setSubmitting(false)
        return
      }

      // 🚫 Prevent duplicate disputes
      const { data: existingDispute } = await supabase
        .from("disputes")
        .select("id")
        .eq("order_id", id)
        .maybeSingle()

      if (existingDispute) {
        Alert.alert(
          "Dispute Already Open",
          "A dispute has already been opened for this return."
        )
        setSubmitting(false)
        return
      }

      /* ---------------- CREATE DISPUTE RECORD ---------------- */
      const { data: dispute, error: disputeError } = await supabase
        .from("disputes")
        .insert({
          order_id: id,
          buyer_id: order.buyer_id,
          seller_id: order.seller_id,
          opened_by: "seller", // 🔥 REQUIRED for role logic
          reason,
          description: description.trim(),
          status: "return_processing", // 🔥 MATCHES YOUR SYSTEM DESIGN
        })
        .select()
        .single()

      if (disputeError || !dispute) throw disputeError

      /* ---------------- UPLOAD EVIDENCE (OPTIONAL) ---------------- */
      if (images.length > 0) {
        const evidenceUrls = await uploadEvidenceImages(dispute.id)

        const { error: updateEvidenceError } = await supabase
          .from("disputes")
          .update({ evidence_urls: evidenceUrls })
          .eq("id", dispute.id)

        if (updateEvidenceError) throw updateEvidenceError
      }

      /* ---------------- FREEZE ESCROW + MOVE TO RETURN_PROCESSING ---------------- */
      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({
          is_disputed: true, // 🧊 freezes cron + auto-complete
          status: "return_processing", // 🔥 THIS = ACTIVE DISPUTE STATE
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (orderUpdateError) throw orderUpdateError

      /* ---------------- NOTIFY BUYER ---------------- */
      await supabase.from("notifications").insert({
        user_id: order.buyer_id,
        type: "dispute_opened",
        title: "Seller Dispute Opened",
        message:
          "The seller has opened a dispute regarding your return. Escrow and automated timers are now paused pending review.",
        related_id: dispute.id,
        created_at: new Date().toISOString(),
      })

      Alert.alert(
        "Dispute Submitted",
        "Your dispute has been opened. The return is now under review and escrow has been frozen."
      )

      router.replace("/seller-hub/orders")
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Unable to submit dispute. Please try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.screen}>
      <AppHeader title="File a Seller Dispute" backRoute="/seller-hub/orders" />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.orderRef}>Order #{id.slice(0, 8)}</Text>

        <Text style={styles.label}>Dispute Reason</Text>
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

        <Text style={styles.label}>Describe the Issue</Text>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Explain what is wrong with the returned item and why the dispute is being opened..."
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Upload Evidence (Optional)</Text>
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
  screen: { flex: 1, backgroundColor: "#EAF4EF" },
  container: { padding: 16, paddingBottom: 32 },

  orderRef: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 12,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 6,
    color: "#0F1E17",
  },

  reasonBtn: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#E8F5EE",
    marginBottom: 8,
  },

  reasonSelected: { backgroundColor: "#1F7A63" },

  reasonText: { color: "#0F1E17", fontWeight: "700" },

  reasonTextSelected: { color: "#fff" },

  textArea: {
    minHeight: 120,
    borderRadius: 10,
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
    backgroundColor: "#D6E6DE",
    alignItems: "center",
    justifyContent: "center",
  },

  addImageText: { fontSize: 32, color: "#0F1E17" },

  submitBtn: {
    marginTop: 22,
    backgroundColor: "#0F1E17",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
})
