import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "../../../../lib/errors/appError"
import { supabase } from "../../../../lib/supabase"

/* ---------------- TYPES (MATCHES DB) ---------------- */
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
  status: string
  created_at: string
  resolution: string | null
  resolved_at: string | null
  admin_notes: string | null
}

/* ---------------- STATUS META (BUYER SIDE LOGIC) ---------------- */
const getStatusMeta = (dispute: Dispute) => {
  const { status, opened_by, seller_responded_at } = dispute

  // If SELLER opened dispute -> buyer is waiting to respond
  if (opened_by === "seller" && !dispute.buyer_responded_at) {
    return {
      label: "Awaiting Your Response",
      color: "#E74C3C",
      subtext:
        "The seller has opened a dispute. Please respond with details or evidence to continue the review process.",
    }
  }

  // If BUYER opened dispute -> waiting on seller
  if (opened_by === "buyer" && !seller_responded_at) {
    return {
      label: "Awaiting Seller Response",
      color: "#F39C12",
      subtext:
        "You opened this dispute. The seller has been notified and is expected to respond.",
    }
  }

  if (status === "under_review") {
    return {
      label: "Under Admin Review",
      color: "#2F80ED",
      subtext:
        "Our team is reviewing the dispute, evidence, and order timeline. Escrow and refunds are paused during review.",
    }
  }

  if (status === "resolved_buyer") {
    return {
      label: "Resolved In Your Favor",
      color: "#27AE60",
      subtext:
        "This dispute was resolved in your favor. Refund and resolution have been processed accordingly.",
    }
  }

  if (status === "resolved_seller") {
    return {
      label: "Resolved With Seller",
      color: "#EB5757",
      subtext:
        "This dispute was resolved in favor of the seller after full review of evidence and return details.",
    }
  }

  return {
    label: "Dispute Active",
    color: "#7F8C8D",
    subtext:
      "This dispute is currently active and pending further review.",
  }
}

export default function BuyerDisputeDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()
  const user = session?.user

  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [loading, setLoading] = useState(true)

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

      // 🔐 Security: Only buyer can view buyer dispute page
      if (data.buyer_id !== user?.id) {
        router.back()
        return
      }

      setDispute(data as Dispute)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load dispute details.",
      })
      setDispute(null)
    } finally {
      setLoading(false)
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

        {/* STATUS BADGE */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusMeta.color },
          ]}
        >
          <Text style={styles.statusText}>{statusMeta.label}</Text>
        </View>

        <Text style={styles.statusSubtext}>{statusMeta.subtext}</Text>

        {/* DISPUTE REASON */}
        <Text style={styles.sectionTitle}>Dispute Reason</Text>
        <View style={styles.card}>
          <Text style={styles.reason}>{dispute.reason}</Text>
          <Text style={styles.description}>{dispute.description}</Text>
        </View>

        {/* ORIGINAL EVIDENCE (FIXED - NO TS ERROR) */}
        {Array.isArray(dispute.evidence_urls) &&
          dispute.evidence_urls.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Submitted Evidence</Text>
              <View style={styles.imageRow}>
                {dispute.evidence_urls.map((url, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: url }}
                    style={styles.image}
                  />
                ))}
              </View>
            </>
          )}

        {/* SELLER RESPONSE */}
        {dispute.seller_response && (
          <>
            <Text style={styles.sectionTitle}>Seller Response</Text>
            <View style={styles.card}>
              <Text style={styles.description}>
                {dispute.seller_response}
              </Text>
            </View>
          </>
        )}

        {/* ADMIN NOTES */}
        {dispute.admin_notes && (
          <>
            <Text style={styles.sectionTitle}>Admin Notes</Text>
            <View style={styles.card}>
              <Text style={styles.description}>
                {dispute.admin_notes}
              </Text>
            </View>
          </>
        )}

        {/* TIMESTAMPS */}
        <Text style={styles.sectionTitle}>Submitted</Text>
        <Text style={styles.info}>
          {new Date(dispute.created_at).toLocaleString()}
        </Text>

        {dispute.resolved_at && (
          <>
            <Text style={styles.sectionTitle}>Resolved At</Text>
            <Text style={styles.info}>
              {new Date(dispute.resolved_at).toLocaleString()}
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F7F8" },

  container: {
    padding: 16,
    paddingBottom: 80,
  },

  orderRef: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
  },

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 6,
  },

  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },

  statusSubtext: {
    marginBottom: 16,
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },

  sectionTitle: {
    fontWeight: "900",
    fontSize: 15,
    marginTop: 18,
    marginBottom: 8,
    color: "#111827",
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
  },

  reason: {
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 6,
  },

  description: {
    color: "#444",
    fontSize: 14,
    lineHeight: 20,
  },

  imageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  image: {
    width: 110,
    height: 110,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
  },

  info: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
    color: "#374151",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
})
