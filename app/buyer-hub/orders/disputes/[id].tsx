import * as ImagePicker from "expo-image-picker"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
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
import { handleAppError } from "../../../../lib/errors/appError"
import { supabase } from "../../../../lib/supabase"

/* ---------------- TYPES ---------------- */
type Dispute = {
  id: string
  order_id: string
  buyer_id: string
  seller_id: string
  opened_by: "buyer" | "seller" | null
  reason: string
  description: string
  evidence_urls: string[] | null
  buyer_evidence_urls?: string[] | null
  seller_evidence_urls?: string[] | null
  buyer_response: string | null
  buyer_responded_at: string | null
  seller_response: string | null
  seller_responded_at: string | null
  status: string
  created_at: string
  resolution: string | null
  resolved_at: string | null
  admin_notes: string | null
}

/* ---------------- STATUS META ---------------- */
const getStatusMeta = (dispute: Dispute) => {
  if (dispute.opened_by === "seller" && !dispute.buyer_responded_at) {
    return {
      label: "Seller Dispute Open – Awaiting Your Response",
      color: "#E74C3C",
      subtext:
        "The seller has opened a dispute on this order. Please submit your response and evidence.",
    }
  }

  if (dispute.status === "under_review") {
    return {
      label: "Under Admin Review",
      color: "#2F80ED",
      subtext:
        "Both parties have submitted evidence. Our team is reviewing the dispute.",
    }
  }

  if (dispute.status === "resolved_buyer") {
    return {
      label: "Resolved In Your Favor",
      color: "#27AE60",
      subtext:
        "This dispute was resolved in your favor. Refund has been processed.",
    }
  }

  if (dispute.status === "resolved_seller") {
    return {
      label: "Resolved With Seller",
      color: "#EB5757",
      subtext:
        "This dispute was resolved in favor of the seller after review.",
    }
  }

  return {
    label: "Awaiting Seller Response",
    color: "#F39C12",
    subtext:
      "You opened this dispute. The seller has been notified and is expected to respond.",
  }
}

export default function BuyerDisputeDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()
  const user = session?.user

  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [loading, setLoading] = useState(true)
  const [responseText, setResponseText] = useState("")
  const [uploading, setUploading] = useState(false)
  const [localEvidence, setLocalEvidence] = useState<string[]>([])

  useEffect(() => {
    if (!id || !user?.id) return
    fetchDispute()
  }, [id, user?.id])

  const fetchDispute = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error

      if (!data) {
        setDispute(null)
        return
      }

      // 🔒 SECURITY: Only the buyer tied to the dispute can view/respond
      if (data.buyer_id !== user?.id) {
        router.back()
        return
      }

      setDispute(data as Dispute)
    } catch (err) {
      handleAppError(err, {
        context: "buyer_dispute_fetch",
        fallbackMessage: "Failed to load dispute details.",
      })
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- LOGIC FLAGS ---------------- */
  const awaitingBuyerResponse = useMemo(() => {
    if (!dispute) return false
    return (
      dispute.opened_by === "seller" &&
      !dispute.buyer_responded_at &&
      dispute.status !== "under_review" &&
      !dispute.status.startsWith("resolved")
    )
  }, [dispute])

  const isLocked = useMemo(() => {
    if (!dispute) return true
    return dispute.status.startsWith("resolved") || dispute.status === "closed"
  }, [dispute])

  /* ---------------- IMAGE PICKER ---------------- */
  const pickEvidenceImage = async () => {
    if (isLocked) {
      Alert.alert("Dispute Closed", "Evidence can no longer be added.")
      return
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.9,
      })

      if (result.canceled) return

      await uploadEvidence(result.assets[0].uri)
    } catch (err) {
      handleAppError(err, {
        context: "buyer_dispute_image_picker",
        fallbackMessage: "Failed to select image.",
      })
    }
  }

  /* ---------------- UPLOAD EVIDENCE (RLS SAFE) ---------------- */
  const uploadEvidence = async (uri: string) => {
    if (!dispute || !user?.id) return

    try {
      setUploading(true)

      const fileExt = uri.split(".").pop() || "jpg"
      const filePath = `${dispute.order_id}/buyer-${Date.now()}.${fileExt}`

      // Convert to blob (required for Supabase storage in RN)
      const response = await fetch(uri)
      const blob = await response.blob()

      const { error: uploadError } = await supabase.storage
        .from("dispute-images")
        .upload(filePath, blob, {
          contentType: "image/jpeg",
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from("dispute-images")
        .getPublicUrl(filePath)

      if (!data?.publicUrl) {
        throw new Error("Failed to get image URL")
      }

      setLocalEvidence((prev) => [...prev, data.publicUrl])
    } catch (err) {
      handleAppError(err, {
        context: "buyer_dispute_image_upload",
        fallbackMessage: "Failed to upload evidence image.",
      })
    } finally {
      setUploading(false)
    }
  }

  /* ---------------- SUBMIT RESPONSE (LIFECYCLE SAFE) ---------------- */
  const submitResponse = async () => {
    if (!dispute || isLocked) return

    if (!responseText.trim() && localEvidence.length === 0) {
      Alert.alert("Response Required", "Please add a response or evidence.")
      return
    }

    try {
      setUploading(true)

      const updatedEvidence = [
        ...(dispute.buyer_evidence_urls ?? []),
        ...localEvidence,
      ]

      const { error } = await supabase
        .from("disputes")
        .update({
          buyer_response: responseText.trim(),
          buyer_responded_at: new Date().toISOString(),
          buyer_evidence_urls: updatedEvidence,
          // 🛡️ Only move to review if seller opened dispute
          status:
            dispute.opened_by === "seller"
              ? "under_review"
              : dispute.status,
        })
        .eq("id", dispute.id)
        .eq("buyer_id", user?.id) // extra security
        .in("status", ["open", "awaiting_response", "under_review"])

      if (error) throw error

      Alert.alert(
        "Response Submitted",
        "Your evidence has been sent for review."
      )
      fetchDispute()
      setResponseText("")
      setLocalEvidence([])
    } catch (err) {
      handleAppError(err, {
        context: "buyer_dispute_submit",
        fallbackMessage: "Failed to submit dispute response.",
      })
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!dispute) {
    return (
      <View style={styles.center}>
        <Text>Dispute not found.</Text>
      </View>
    )
  }

  const statusMeta = getStatusMeta(dispute)

  return (
    <View style={styles.screen}>
      <AppHeader title="Dispute Details" backRoute="/buyer-hub/orders" />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.orderRef}>
          Order #{dispute.order_id.slice(0, 8)}
        </Text>

        <View style={[styles.statusBadge, { backgroundColor: statusMeta.color }]}>
          <Text style={styles.statusText}>{statusMeta.label}</Text>
        </View>

        <Text style={styles.statusSubtext}>{statusMeta.subtext}</Text>

        <Text style={styles.sectionTitle}>Dispute Reason</Text>
        <View style={styles.card}>
          <Text style={styles.reason}>{dispute.reason}</Text>
          <Text style={styles.description}>{dispute.description}</Text>
        </View>

        {/* AWAITING BUYER RESPONSE UI */}
        {awaitingBuyerResponse && !isLocked && (
          <>
            <Text style={styles.sectionTitle}>Your Response</Text>
            <View style={styles.card}>
              <TextInput
                style={styles.textArea}
                placeholder="Explain your side and upload any proof (photos, screenshots, etc.)"
                multiline
                value={responseText}
                onChangeText={setResponseText}
              />

              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={pickEvidenceImage}
                disabled={uploading}
              >
                <Text style={styles.uploadText}>
                  {uploading ? "Uploading..." : "Upload Evidence Image"}
                </Text>
              </TouchableOpacity>

              {localEvidence.length > 0 && (
                <View style={styles.imageRow}>
                  {localEvidence.map((url, i) => (
                    <Image key={i} source={{ uri: url }} style={styles.image} />
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={submitResponse}
                disabled={uploading}
              >
                <Text style={styles.submitText}>Submit Response</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* UNDER REVIEW BOX */}
        {dispute.status === "under_review" && (
          <View style={styles.reviewBox}>
            <Text style={styles.reviewText}>
              Both the buyer and seller have submitted evidence.
              This dispute is currently under admin review.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F7F8" },
  container: { padding: 16, paddingBottom: 80 },
  orderRef: { fontSize: 13, fontWeight: "800", marginBottom: 10 },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 6,
  },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  statusSubtext: {
    marginBottom: 16,
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },
  sectionTitle: {
    fontWeight: "900",
    fontSize: 15,
    marginTop: 18,
    marginBottom: 8,
    color: "#111827",
  },
  card: { backgroundColor: "#fff", padding: 14, borderRadius: 12 },
  reason: { fontWeight: "800", fontSize: 14, marginBottom: 6 },
  description: { color: "#444", fontSize: 14, lineHeight: 20 },
  textArea: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    textAlignVertical: "top",
  },
  uploadBtn: {
    backgroundColor: "#7FAF9B",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  uploadText: { color: "#fff", fontWeight: "700" },
  submitBtn: {
    backgroundColor: "#0F1E17",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  submitText: { color: "#fff", fontWeight: "800" },
  imageRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  image: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  reviewBox: {
    marginTop: 20,
    backgroundColor: "#EEF4FF",
    padding: 16,
    borderRadius: 12,
  },
  reviewText: {
    fontWeight: "700",
    color: "#1E3A8A",
    textAlign: "center",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
})
