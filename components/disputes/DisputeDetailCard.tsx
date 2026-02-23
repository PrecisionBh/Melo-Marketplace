import * as ImagePicker from "expo-image-picker"
import { useFocusEffect } from "expo-router"
import { useCallback, useState } from "react"
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

type Role = "buyer" | "seller"

type Dispute = {
  id: string
  order_id: string
  buyer_id: string
  seller_id: string
  opened_by: "buyer" | "seller" | null
  reason: string
  description: string
  buyer_evidence_urls: string[] | null
  seller_evidence_urls: string[] | null
  buyer_response: string | null
  buyer_responded_at: string | null
  seller_response: string | null
  seller_responded_at: string | null
  status: string
  created_at: string
  resolved_at: string | null
  resolution: string | null
  admin_notes: string | null
}

type Props = {
  disputeId: string
  role: Role
}

const getStatusMeta = (
  status: string,
  openedBy?: string | null,
  isReturnDispute?: boolean,
  role?: Role
) => {
  if (isReturnDispute) {
    return {
      label: "Return Disputed – Escrow Frozen",
      color: "#EB5757",
      subtext:
        role === "buyer"
          ? "The seller has disputed this return. Your refund is paused and escrow is frozen until review."
          : "You have disputed this return. Escrow is frozen until review is completed.",
    }
  }

  if (status === "under_review") {
    return {
      label: "Under Review",
      color: "#2F80ED",
      subtext:
        "Both parties have submitted evidence. Admin review in progress. Escrow remains frozen.",
    }
  }

  if (status === "resolved_buyer") {
    return {
      label: "Resolved In Buyer's Favor",
      color: "#27AE60",
      subtext: "This dispute was resolved in favor of the buyer.",
    }
  }

  if (status === "resolved_seller") {
    return {
      label: "Resolved In Seller's Favor",
      color: "#27AE60",
      subtext: "This dispute was resolved in favor of the seller.",
    }
  }

  if (openedBy === "buyer") {
    return {
      label:
        role === "seller"
          ? "Buyer Dispute Open – Awaiting Your Response"
          : "Dispute Submitted – Awaiting Seller Response",
      color: "#F2994A",
      subtext:
        role === "seller"
          ? "The buyer opened a dispute. Review and submit your evidence."
          : "You opened this dispute. The seller has been notified.",
    }
  }

  if (openedBy === "seller") {
    return {
      label:
        role === "buyer"
          ? "Seller Dispute Open – Awaiting Your Response"
          : "Seller Dispute Open",
      color: "#F2994A",
      subtext:
        role === "buyer"
          ? "The seller opened a dispute. Submit your response and evidence."
          : "You opened a dispute on this return. Escrow is frozen.",
    }
  }

  return {
    label: "Dispute Active",
    color: "#F2994A",
    subtext: "This dispute is active and pending review.",
  }
}

export default function DisputeDetailCard({
  disputeId,
  role,
}: Props) {
  const { session } = useAuth()
  const user = session?.user

  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [response, setResponse] = useState("")
  const [images, setImages] = useState<string[]>([])

  useFocusEffect(
    useCallback(() => {
      if (disputeId && user?.id) {
        fetchDispute()
      }
    }, [disputeId, user?.id])
  )

  const fetchDispute = async () => {
    if (!disputeId || !user?.id) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .eq("id", disputeId)
        .single()

      if (error) throw error

      // 🔒 Security gate (role-based)
      if (
        (role === "buyer" && data.buyer_id !== user.id) ||
        (role === "seller" && data.seller_id !== user.id)
      ) {
        return
      }

      setDispute(data)

      // 🔥 CORRECT MELO SCHEMA
      if (role === "buyer") {
        setResponse(data.buyer_response || "")
        setImages(data.buyer_evidence_urls || [])
      } else {
        setResponse(data.seller_response || "")
        setImages(data.seller_evidence_urls || [])
      }
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load dispute details.",
      })
    } finally {
      setLoading(false)
    }
  }

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
        context: "dispute_image_picker",
      })
    }
  }

  const uploadImagesToStorage = async () => {
    if (!images.length || !dispute) return []

    const uploadedUrls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const uri = images[i]

      if (uri.startsWith("http")) {
        uploadedUrls.push(uri)
        continue
      }

      const ext = uri.split(".").pop() || "jpg"
      const path = `${dispute.order_id}/${role}-${i}.${ext}`

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

  const submitResponse = async () => {
    if (!dispute || !response.trim() || dispute.resolved_at) return

    try {
      setSubmitting(true)

      const urls = await uploadImagesToStorage()

      const payload =
        role === "buyer"
          ? {
              buyer_response: response.trim(),
              buyer_responded_at: new Date().toISOString(),
              buyer_evidence_urls: urls,
              status: "under_review",
            }
          : {
              seller_response: response.trim(),
              seller_responded_at: new Date().toISOString(),
              seller_evidence_urls: urls,
              status: "under_review",
            }

      const { error } = await supabase
        .from("disputes")
        .update(payload)
        .eq("id", dispute.id)

      if (error) throw error

      await fetchDispute()
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to submit response.",
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

  const isReturnDispute = dispute.opened_by === "seller"

  const statusMeta = getStatusMeta(
    dispute.status,
    dispute.opened_by,
    isReturnDispute,
    role
  )

  const needsToRespond =
    role === "buyer"
      ? dispute.opened_by === "seller" &&
        !dispute.buyer_responded_at &&
        !dispute.resolved_at
      : dispute.opened_by === "buyer" &&
        !dispute.seller_responded_at &&
        !dispute.resolved_at

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.order}>
          Order #{dispute.order_id.slice(0, 8)}
        </Text>

        <View
          style={[
            styles.badge,
            { backgroundColor: statusMeta.color },
          ]}
        >
          <Text style={styles.badgeText}>{statusMeta.label}</Text>
        </View>

        <Text style={styles.subtext}>{statusMeta.subtext}</Text>

        <Text style={styles.section}>Dispute Reason</Text>
        <Text style={styles.reason}>{dispute.reason}</Text>
        <Text style={styles.desc}>{dispute.description}</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 120 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DDEDE6",
  },
  order: { fontWeight: "900", fontSize: 14, marginBottom: 10 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  badgeText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  subtext: { color: "#6B8F7D", fontWeight: "600", marginBottom: 12 },
  section: { fontWeight: "900", marginTop: 10 },
  reason: { fontWeight: "800", marginTop: 6 },
  desc: { marginTop: 4, fontWeight: "600", color: "#0F1E17" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
})