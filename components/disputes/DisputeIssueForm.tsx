import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
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

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { notify } from "@/lib/notifications/notify"
import { supabase } from "@/lib/supabase"

type Props = {
  role: "buyer" | "seller"
  orderId: string
  title?: string
}

const BUYER_REASONS = [
  "Item not received",
  "Item not as described",
  "Item arrived damaged",
  "Seller unresponsive",
  "Other",
]

const SELLER_REASONS = [
  "Item not returned",
  "Returned item damaged",
  "Wrong item returned",
  "Return abuse / fraud",
  "Other",
]

export default function DisputeIssueForm({
  role,
  orderId,
  title,
}: Props) {
  const router = useRouter()
  const { session } = useAuth()
  const user = session?.user

  const [reason, setReason] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const REASONS = role === "buyer" ? BUYER_REASONS : SELLER_REASONS

  if (!user) return null

  /* ---------------- SAFE BACK ---------------- */
  const safeBack = () => {
    try {
      router.back()
    } catch {
      if (role === "buyer") {
        router.replace(`/buyer-hub/orders/${orderId}` as any)
      } else {
        router.replace(`/seller-hub/orders/${orderId}` as any)
      }
    }
  }

  /* ---------------- IMAGE PICKER (UPGRADED TO MATCH WORKING UPLOADER) ---------------- */
  const pickImage = async () => {
    try {
      const MAX = 7

      if (images.length >= MAX) {
        Alert.alert("Limit reached", `You can upload up to ${MAX} photos.`)
        return
      }

      const remainingSlots = MAX - images.length

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
      })

      if (!result.canceled && result.assets?.length > 0) {
        const newUris = result.assets.map((asset) => asset.uri)

        setImages((prev) => {
          const combined = [...prev, ...newUris]
          return combined.slice(0, MAX)
        })
      }
    } catch (err) {
      handleAppError(err, {
        context: "dispute_image_picker",
        fallbackMessage: "Failed to select image.",
      })
    }
  }

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((img) => img !== uri))
  }

  /* ---------------- UPLOAD EVIDENCE (UNCHANGED) ---------------- */
  const uploadEvidenceImages = async (disputeId: string) => {
    if (!images.length) return []

    const uploadedUrls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const uri = images[i]
      const ext = uri.split(".").pop() || "jpg"
      const path = `${disputeId}/${role}-${i}.${ext}`

      const formData = new FormData()
      formData.append("file", {
        uri,
        name: path,
        type: `image/${ext === "jpg" ? "jpeg" : ext}`,
      } as any)

      const { error } = await supabase.storage
        .from("dispute-images")
        .upload(path, formData, { upsert: false })

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

  /* ---------------- SUBMIT DISPUTE (UNCHANGED) ---------------- */
  const submitDispute = async () => {
    if (!orderId) {
      Alert.alert("Error", "Missing order reference.")
      return
    }

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
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(
          "id, buyer_id, seller_id, status, is_disputed, escrow_status"
        )
        .eq("id", orderId)
        .single()

      if (orderError || !order) throw orderError

      if (role === "buyer") {
        if (order.buyer_id !== user.id) {
          Alert.alert("Access denied", "You cannot dispute this order.")
          return
        }
        if (order.status !== "shipped") {
          Alert.alert(
            "Dispute Not Allowed",
            "Buyer disputes are only allowed after the order has shipped."
          )
          return
        }
      }

      if (role === "seller") {
        if (order.seller_id !== user.id) {
          Alert.alert("Access denied", "You are not the seller.")
          return
        }
        if (order.status !== "return_started") {
          Alert.alert(
            "Dispute Not Available",
            "Seller disputes can only be opened during an active return."
          )
          return
        }
      }

      if (order.is_disputed) {
        Alert.alert(
          "Dispute Already Open",
          "There is already an active dispute for this order."
        )
        return
      }

      const { data: dispute, error: disputeError } = await supabase
        .from("disputes")
        .insert({
          order_id: orderId,
          buyer_id: order.buyer_id,
          seller_id: order.seller_id,
          opened_by: role,
          reason,
          description: description.trim(),
          status: "issue_open",
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (disputeError || !dispute) throw disputeError

      if (images.length > 0) {
        const urls = await uploadEvidenceImages(dispute.id)

        const payload =
          role === "buyer"
            ? { buyer_evidence_urls: urls }
            : { seller_evidence_urls: urls }

        const { error: evidenceError } = await supabase
          .from("disputes")
          .update(payload)
          .eq("id", dispute.id)

        if (evidenceError) throw evidenceError
      }

      const newStatus =
        role === "buyer" ? "disputed" : "return_processing"

      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({
          is_disputed: true,
          status: newStatus,
          escrow_status: "held",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)

      if (orderUpdateError) throw orderUpdateError

      const notifyUserId =
        role === "buyer" ? order.seller_id : order.buyer_id

      await notify({
        userId: notifyUserId,
        type: "dispute",
        title: "Dispute Opened",
        body:
          role === "buyer"
            ? "A buyer has opened a dispute on this order."
            : "The seller has opened a dispute regarding your return.",
        data: {
          route:
            role === "buyer"
              ? "/seller-hub/orders/[id]"
              : "/buyer-hub/orders/[id]",
          params: { id: orderId },
        },
      })

      Alert.alert(
        "Dispute Submitted",
        "Your dispute has been submitted. Escrow has been frozen while this issue is reviewed."
      )

      safeBack()
    } catch (err) {
      handleAppError(err, {
        context: "unified_dispute_submit",
        fallbackMessage:
          "Unable to submit dispute. Please try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>
          {title ?? "Open a Dispute"}
        </Text>

        <Text style={styles.orderRef}>
          Order #{`Melo${orderId?.replace(/-/g, "").slice(0, 6)}`}
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
            <Text style={styles.reasonText}>{r}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>Describe the Issue</Text>
        <TextInput
          style={styles.textArea}
          multiline
          value={description}
          onChangeText={setDescription}
          placeholder="Explain the issue in detail..."
        />

        {/* NEW IMAGE UPLOADER (MATCHES YOUR WORKING COMPONENT) */}
        <Text style={styles.label}>
          Evidence Images ({images.length}/7)
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.uploadRow}
        >
          {images.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.squareWrapper}>
              <Image source={{ uri }} style={styles.squareImage} />
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => removeImage(uri)}
              >
                <Text style={styles.deleteText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}

          {Array.from({ length: Math.max(7 - images.length, 0) }).map(
            (_, i) => (
              <TouchableOpacity
                key={`empty-${i}`}
                style={styles.addSquare}
                onPress={pickImage}
                activeOpacity={0.85}
              >
                <Text style={styles.addPlus}>＋</Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>

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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },
  container: { padding: 16, paddingBottom: 120 },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F1E17",
    marginBottom: 8,
  },
  orderRef: {
    fontSize: 13,
    fontWeight: "900",
    color: "#6B8F7D",
    marginBottom: 14,
  },
  label: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 18,
    marginBottom: 10,
    color: "#0F1E17",
  },
  reasonBtn: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#DDEDE6",
  },
  reasonSelected: {
    backgroundColor: "#7FAF9B",
    borderColor: "#7FAF9B",
  },
  reasonText: {
    color: "#0F1E17",
    fontWeight: "800",
  },
  textArea: {
    minHeight: 140,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderWidth: 1,
    borderColor: "#DDEDE6",
    textAlignVertical: "top",
  },

  /* NEW IMAGE STYLES (ONLY ADDITION) */
  uploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  squareWrapper: {
    width: 110,
    height: 110,
    position: "relative",
  },
  squareImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  addSquare: {
    width: 110,
    height: 110,
    borderWidth: 1,
    borderColor: "#DDEDE6",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  addPlus: {
    fontSize: 28,
    fontWeight: "900",
    color: "#7FAF9B",
  },
  deleteButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#E5484D",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },

  submitBtn: {
    marginTop: 28,
    backgroundColor: "#1F7A63",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
})