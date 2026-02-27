import * as ImagePicker from "expo-image-picker"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
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
import { notify } from "@/lib/notifications/notify"
import { supabase } from "@/lib/supabase"

type Dispute = {
  id: string
  order_id: string
  buyer_id: string
  seller_id: string
  reason: string
  description: string
  buyer_evidence_urls: string[] | null
  seller_evidence_urls: string[] | null
  seller_response: string | null
  seller_responded_at: string | null
  status: string
}

export default function SellerDisputeIssue() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()
  const user = session?.user

  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [response, setResponse] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (id && user?.id) {
      loadDispute()
    }
  }, [id, user?.id])

  const loadDispute = async () => {
    try {
      if (!id || !user?.id) {
        setDispute(null)
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .eq("order_id", id)
        .single()

      if (error) throw error

      if (!data) {
        Alert.alert("Dispute not found")
        router.back()
        return
      }

      if (data.seller_id !== user.id) {
        Alert.alert("Access denied")
        router.back()
        return
      }

      if (
        data.status?.startsWith("resolved") ||
        data.status === "closed"
      ) {
        Alert.alert(
          "Dispute Closed",
          "This dispute has already been resolved."
        )
        router.back()
        return
      }

      setDispute(data as Dispute)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load dispute.",
      })
      setDispute(null)
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- IMAGE PICKER (MATCHES WORKING UPLOADER) ---------------- */
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
        context: "seller_dispute_image_picker",
        fallbackMessage: "Failed to select images. Please try again.",
      })
    }
  }

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((img) => img !== uri))
  }

  /* ---------------- UPLOAD SELLER EVIDENCE (FAIL-SAFE - NO SILENT SUCCESS) ---------------- */
  const uploadImages = async (): Promise<string[]> => {
    if (!dispute || images.length === 0) return []

    const uploaded: string[] = []

    for (let i = 0; i < images.length; i++) {
      const uri = images[i]

      try {
        const extMatch = uri.split(".").pop()?.toLowerCase()
        const ext = extMatch && extMatch.length <= 4 ? extMatch : "jpg"

        const fileName = `${dispute.id}/seller-${Date.now()}-${i}.${ext}`

        const fetchRes = await fetch(uri)
        if (!fetchRes.ok) {
          throw new Error("Failed to read local image file")
        }

        const blob = await fetchRes.blob()

        const { error } = await supabase.storage
          .from("dispute-images")
          .upload(fileName, blob, {
            contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
            upsert: false,
          })

        if (error) {
          console.error("Supabase storage error:", error)
          throw error
        }

        const { data } = supabase.storage
          .from("dispute-images")
          .getPublicUrl(fileName)

        if (!data?.publicUrl) {
          throw new Error("Failed to generate public URL")
        }

        uploaded.push(data.publicUrl)
      } catch (err) {
        console.error("🚨 SELLER DISPUTE IMAGE UPLOAD FAILED:", err)
        throw new Error(
          "Image upload failed due to network/storage error. Please check your connection and try again."
        )
      }
    }

    return uploaded
  }

  /* ---------------- SUBMIT SELLER RESPONSE ---------------- */
  const submitResponse = async () => {
    if (!response.trim()) {
      Alert.alert("Please enter a response")
      return
    }

    if (!dispute || !user?.id) {
      Alert.alert("Error", "Dispute not found.")
      return
    }

    try {
      setSubmitting(true)

      const uploadedUrls = await uploadImages()

      const mergedEvidence = [
        ...(dispute.seller_evidence_urls ?? []),
        ...uploadedUrls,
      ]

      const { error } = await supabase
        .from("disputes")
        .update({
          seller_response: response.trim(),
          seller_responded_at: new Date().toISOString(),
          seller_evidence_urls: mergedEvidence,
          status: "under_review",
        })
        .eq("id", dispute.id)
        .eq("seller_id", user.id)

      if (error) throw error

      try {
        await notify({
          userId: dispute.buyer_id,
          type: "order",
          title: "Seller Responded to Dispute",
          body:
            "The seller has submitted their response and evidence. The dispute is now under review.",
          data: {
            route: "/buyer-hub/orders/disputes/[id]",
            params: { id: dispute.id },
          },
        })
      } catch (notifyErr) {
        console.warn("Notification failed:", notifyErr)
      }

      Alert.alert(
        "Response submitted",
        "Your response and evidence have been sent for review."
      )

      router.back()
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Unable to submit response.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------------- UI ---------------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!dispute) return null

  return (
    <View style={styles.screen}>
      <AppHeader title="Dispute Response" backRoute="/seller-hub/orders" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* BUYER ISSUE */}
        <View style={styles.card}>
          <Text style={styles.label}>Buyer Issue</Text>
          <Text style={styles.reason}>{dispute.reason}</Text>
          <Text style={styles.description}>{dispute.description}</Text>
        </View>

        {/* BUYER EVIDENCE */}
        {dispute.buyer_evidence_urls?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Buyer Evidence</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dispute.buyer_evidence_urls.map((url) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={styles.image}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* SELLER RESPONSE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Response</Text>

          <TextInput
            style={styles.input}
            placeholder="Explain your side of the dispute..."
            multiline
            value={response}
            onChangeText={setResponse}
          />

          {/* IMAGE UPLOADER (MATCHES YOUR WORKING COMPONENT UX) */}
          <Text style={styles.sectionTitle}>
            Evidence Photos (Optional)
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

            {Array.from({
              length: Math.max(7 - images.length, 0),
            }).map((_, i) => (
              <TouchableOpacity
                key={`empty-${i}`}
                style={styles.addSquare}
                onPress={pickImage}
                activeOpacity={0.85}
              >
                <Text style={styles.addPlus}>＋</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.submitBtn}
            disabled={submitting}
            onPress={submitResponse}
          >
            <Text style={styles.submitText}>
              {submitting ? "Submitting..." : "Submit Response"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F7F8",
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },
  label: {
    fontWeight: "800",
    marginBottom: 6,
  },
  reason: {
    fontWeight: "900",
    fontSize: 16,
  },
  description: {
    marginTop: 8,
    color: "#444",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontWeight: "800",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    minHeight: 120,
    textAlignVertical: "top",
  },
  uploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  squareWrapper: {
    width: 120,
    height: 120,
    position: "relative",
  },
  squareImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  addSquare: {
    width: 120,
    height: 120,
    borderWidth: 1,
    borderColor: "#CFE3DA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  addPlus: {
    fontSize: 28,
    color: "#7FAF9B",
    fontWeight: "900",
  },
  deleteButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#E5484D",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginRight: 8,
  },
  submitBtn: {
    marginTop: 20,
    backgroundColor: "#1F7A63",
    padding: 16,
    borderRadius: 14,
  },
  submitText: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
})