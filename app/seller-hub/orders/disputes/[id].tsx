import * as ImagePicker from "expo-image-picker"
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router"
import { useCallback, useState } from "react"
import {
  ActivityIndicator,
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

type Dispute = {
  id: string
  order_id: string
  buyer_id: string
  seller_id: string
  opened_by: "buyer" | "seller" | null
  reason: string
  description: string
  evidence_urls: string[] | null
  buyer_response: string | null
  buyer_responded_at: string | null
  seller_response: string | null
  seller_responded_at: string | null
  seller_evidence_urls?: string[] | null
  status: string
  created_at: string
  resolved_at: string | null
  resolution: string | null
  admin_notes: string | null
}

const getStatusMeta = (status: string, openedBy?: string | null) => {
  if (status === "under_review") {
    return {
      label: "Under Review",
      color: "#2F80ED",
      subtext:
        "Both the buyer and you have submitted evidence. This dispute is under review.",
    }
  }

  if (status === "resolved_seller") {
    return {
      label: "Resolved With Seller",
      color: "#27AE60",
      subtext:
        "This dispute was resolved in your favor. The order has been completed.",
    }
  }

  if (status === "resolved_buyer") {
    return {
      label: "Resolved With Buyer",
      color: "#EB5757",
      subtext:
        "This dispute was resolved in favor of the buyer. A refund has been issued.",
    }
  }

  if (openedBy === "buyer") {
    return {
      label: "Buyer Dispute Open – Awaiting Your Response",
      color: "#F2994A",
      subtext:
        "The buyer has opened a dispute. Please review the reason and submit your response and evidence.",
    }
  }

  return {
    label: "Dispute Active",
    color: "#F2994A",
    subtext:
      "This dispute is currently active and pending further review.",
  }
}

export default function SellerDisputeDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()
  const user = session?.user

  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [response, setResponse] = useState("")
  const [images, setImages] = useState<string[]>([])

  useFocusEffect(
    useCallback(() => {
      if (id && user?.id) {
        fetchDispute()
      }
    }, [id, user?.id])
  )

  const fetchDispute = async () => {
    if (!id || !user?.id) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error

      if (!data || data.seller_id !== user.id) {
        router.back()
        return
      }

      // 🔒 Block editing if already resolved (protects seller lifecycle)
      if (data.resolved_at) {
        setDispute(data)
        setResponse(data.seller_response || "")
        setImages(data.seller_evidence_urls || [])
        return
      }

      setDispute(data)
      setResponse(data.seller_response || "")
      setImages(data.seller_evidence_urls || [])
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load dispute details.",
      })
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- IMAGE PICKER (FIXED FOR EXPO) ---------------- */
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      })

      if (result.canceled) return

      const uris = result.assets.map((asset) => asset.uri)
      setImages((prev) => [...prev, ...uris])
    } catch (err) {
      handleAppError(err, {
        context: "seller_dispute_image_picker",
        fallbackMessage: "Failed to select evidence image.",
      })
    }
  }

  /* ---------------- UPLOAD TO SUPABASE STORAGE (RN SAFE) ---------------- */
  const uploadImagesToStorage = async () => {
    if (!images.length || !dispute) return []

    const uploadedUrls: string[] = []
    const role = "seller"

    for (let i = 0; i < images.length; i++) {
      const uri = images[i]

      // Skip already uploaded URLs (editing case)
      if (uri.startsWith("http")) {
        uploadedUrls.push(uri)
        continue
      }

      try {
        const response = await fetch(uri)
        const blob = await response.blob()

        const fileExt = "jpg"
        const path = `${dispute.order_id}/${role}-${Date.now()}-${i}.${fileExt}`

        const { error } = await supabase.storage
          .from("dispute-images")
          .upload(path, blob, {
            contentType: "image/jpeg",
            upsert: false,
          })

        if (error) throw error

        const { data: urlData } = supabase.storage
          .from("dispute-images")
          .getPublicUrl(path)

        if (!urlData?.publicUrl) {
          throw new Error("Failed to retrieve dispute image URL")
        }

        uploadedUrls.push(urlData.publicUrl)
      } catch (err) {
        handleAppError(err, {
          context: "dispute_image_upload",
          fallbackMessage: "Failed to upload evidence image.",
        })
      }
    }

    return uploadedUrls
  }

  /* ---------------- SUBMIT SELLER RESPONSE ---------------- */
  const submitResponse = async () => {
    if (!dispute || !response.trim() || dispute.resolved_at) return

    try {
      setSubmitting(true)

      const uploadedUrls = await uploadImagesToStorage()

      const { error } = await supabase
        .from("disputes")
        .update({
          seller_response: response.trim(),
          seller_responded_at: new Date().toISOString(),
          seller_evidence_urls: uploadedUrls,
          status: "under_review",
        })
        .eq("id", dispute.id)
        .eq("seller_id", user?.id)

      if (error) throw error

      await fetchDispute()
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to submit dispute response.",
      })
    } finally {
      setSubmitting(false)
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

  const statusMeta = getStatusMeta(dispute.status, dispute.opened_by)

  const sellerNeedsToRespond =
    dispute.opened_by === "buyer" &&
    !dispute.seller_responded_at &&
    !dispute.resolved_at

  const showUnderReview =
    dispute.seller_responded_at && !dispute.resolved_at

  const isResolved = !!dispute.resolved_at

  return (
    <View style={styles.screen}>
      <AppHeader title="Dispute Details" backRoute="/seller-hub/orders" />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.orderText}>
          Order #{dispute.order_id.slice(0, 8)}
        </Text>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusMeta.color },
          ]}
        >
          <Text style={styles.statusText}>{statusMeta.label}</Text>
        </View>

        <Text style={styles.statusSubtext}>{statusMeta.subtext}</Text>

        <Text style={styles.sectionTitle}>Buyer Dispute Reason</Text>
        <View style={styles.card}>
          <Text style={styles.reason}>{dispute.reason}</Text>
          <Text style={styles.description}>{dispute.description}</Text>
        </View>

        {dispute.evidence_urls?.length ? (
          <>
            <Text style={styles.sectionTitle}>Buyer Evidence</Text>
            <ScrollView horizontal>
              {dispute.evidence_urls.map((url) => (
                <Image key={url} source={{ uri: url }} style={styles.image} />
              ))}
            </ScrollView>
          </>
        ) : null}

        {sellerNeedsToRespond && (
          <>
            <Text style={styles.sectionTitle}>
              Your Response & Evidence
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your response to the dispute..."
              value={response}
              onChangeText={setResponse}
              multiline
            />

            <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
              <Text style={styles.uploadText}>
                Upload Evidence Images
              </Text>
            </TouchableOpacity>

            <ScrollView horizontal>
              {images.map((uri, index) => (
                <Image key={index} source={{ uri }} style={styles.image} />
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={submitResponse}
              disabled={submitting}
            >
              <Text style={styles.submitText}>
                {submitting ? "Submitting..." : "Submit Response"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {showUnderReview && (
          <View style={styles.reviewBox}>
            <Text style={styles.reviewText}>
              Both the buyer and you have sent in your evidence. This dispute is under review.
            </Text>
          </View>
        )}

        {isResolved && (
          <View style={styles.resolvedBox}>
            <Text style={styles.resolvedText}>
              {dispute.status === "resolved_seller"
                ? "This dispute has been resolved in your favor. The order has been completed."
                : "This dispute has been resolved in favor of the buyer. A refund has been issued."}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F7F8" },
  container: { padding: 16, paddingBottom: 80 },
  orderText: { fontSize: 14, fontWeight: "800", marginBottom: 10 },
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
  },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
  },
  reason: { fontWeight: "800", fontSize: 14, marginBottom: 6 },
  description: { color: "#444", fontSize: 14, lineHeight: 20 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    minHeight: 120,
    textAlignVertical: "top",
  },
  uploadBtn: {
    marginTop: 12,
    backgroundColor: "#2F80ED",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  uploadText: { color: "#fff", fontWeight: "800" },
  submitBtn: {
    marginTop: 16,
    backgroundColor: "#27AE60",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  reviewBox: {
    marginTop: 20,
    backgroundColor: "#E3F2FD",
    padding: 18,
    borderRadius: 12,
  },
  reviewText: {
    fontWeight: "800",
    color: "#1E3A8A",
    textAlign: "center",
  },
  resolvedBox: {
    marginTop: 20,
    backgroundColor: "#E8F5E9",
    padding: 18,
    borderRadius: 12,
  },
  resolvedText: {
    fontWeight: "900",
    color: "#1B5E20",
    textAlign: "center",
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 10,
    marginTop: 10,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
})
