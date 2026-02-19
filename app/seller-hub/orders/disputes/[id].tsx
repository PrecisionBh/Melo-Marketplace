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
  status: string
  created_at: string
  resolved_at: string | null
  resolution: string | null
  admin_notes: string | null
}

/* ---------------- STATUS BADGE META (DB-ALIGNED) ---------------- */
const getStatusMeta = (status: string, openedBy?: string | null) => {
  switch (status) {
    case "issue_open":
      return {
        label:
          openedBy === "seller"
            ? "Seller Dispute Open – Awaiting Review"
            : "Buyer Dispute Open – Awaiting Review",
        color: "#F2994A",
        subtext:
          "A dispute has been opened. Escrow, returns, and automated timers are paused pending admin review.",
      }

    case "buyer_responded":
      return {
        label: "Buyer Responded – Pending Review",
        color: "#F2C94C",
        subtext:
          "The buyer has submitted their response and evidence. Awaiting admin review.",
      }

    case "seller_responded":
      return {
        label: "Seller Responded – Pending Review",
        color: "#F2C94C",
        subtext:
          "The seller has submitted their response and evidence. Awaiting admin review.",
      }

    case "under_review":
      return {
        label: "Under Admin Review",
        color: "#2F80ED",
        subtext:
          "An administrator is actively reviewing the dispute, evidence, and return details.",
      }

    case "resolved_buyer":
      return {
        label: "Resolved With Buyer",
        color: "#EB5757",
        subtext:
          "This dispute was resolved in favor of the buyer. Funds and resolution were handled accordingly.",
      }

    case "resolved_seller":
      return {
        label: "Resolved With Seller",
        color: "#27AE60",
        subtext:
          "This dispute was resolved in favor of the seller. Escrow and return outcome were finalized.",
      }

    default:
      return {
        label: "Dispute Active",
        color: "#999999",
        subtext:
          "This dispute is currently active and pending further review.",
      }
  }
}

export default function SellerDisputeDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()
  const user = session?.user

  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [loading, setLoading] = useState(true)

  /* 🔁 REFRESH EVERY TIME SCREEN GAINS FOCUS */
  useFocusEffect(
    useCallback(() => {
      if (id && user?.id) {
        fetchDispute()
      }
    }, [id, user?.id])
  )

  const fetchDispute = async () => {
    try {
      if (!id || !user?.id) {
        setDispute(null)
        setLoading(false)
        return
      }

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

      // 🔐 Only seller can view seller dispute page
      if (data.seller_id !== user.id) {
        router.back()
        return
      }

      setDispute(data)
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

  const statusMeta = getStatusMeta(dispute.status, dispute.opened_by)

  return (
    <View style={styles.screen}>
      <AppHeader title="Dispute Details" backRoute="/seller-hub/orders" />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.orderText}>
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

        {/* WHO OPENED DISPUTE */}
        <Text style={styles.sectionTitle}>Dispute Opened By</Text>
        <View style={styles.card}>
          <Text style={styles.infoStrong}>
            {dispute.opened_by === "seller" ? "You (Seller)" : "Buyer"}
          </Text>
        </View>

        {/* ORIGINAL DISPUTE REASON */}
        <Text style={styles.sectionTitle}>
          {dispute.opened_by === "seller"
            ? "Seller Dispute Reason"
            : "Buyer Dispute Reason"}
        </Text>
        <View style={styles.card}>
          <Text style={styles.reason}>{dispute.reason}</Text>
          <Text style={styles.description}>{dispute.description}</Text>
        </View>

        {/* ORIGINAL EVIDENCE */}
        {dispute.evidence_urls?.length ? (
          <>
            <Text style={styles.sectionTitle}>Submitted Evidence</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dispute.evidence_urls.map((url) => (
                <Image key={url} source={{ uri: url }} style={styles.image} />
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* BUYER RESPONSE (NEW DB SUPPORT) */}
        {dispute.buyer_response && (
          <>
            <Text style={styles.sectionTitle}>Buyer Response</Text>
            <View style={styles.card}>
              <Text style={styles.description}>
                {dispute.buyer_response}
              </Text>
            </View>
          </>
        )}

        {/* TIMESTAMPS */}
        <Text style={styles.sectionTitle}>Dispute Submitted</Text>
        <Text style={styles.info}>
          {new Date(dispute.created_at).toLocaleString()}
        </Text>

        {dispute.buyer_responded_at && (
          <>
            <Text style={styles.sectionTitle}>
              Buyer Responded At
            </Text>
            <Text style={styles.info}>
              {new Date(
                dispute.buyer_responded_at
              ).toLocaleString()}
            </Text>
          </>
        )}

        {dispute.resolution && (
          <>
            <Text style={styles.sectionTitle}>Final Resolution</Text>
            <Text style={styles.info}>
              {dispute.resolution.replace("_", " ")}
            </Text>
          </>
        )}

        {dispute.admin_notes && (
          <>
            <Text style={styles.sectionTitle}>Admin Notes</Text>
            <Text style={styles.info}>{dispute.admin_notes}</Text>
          </>
        )}

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

  orderText: {
    fontSize: 14,
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
    textTransform: "capitalize",
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

  image: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 10,
  },

  info: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
    color: "#374151",
  },

  infoStrong: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
})
