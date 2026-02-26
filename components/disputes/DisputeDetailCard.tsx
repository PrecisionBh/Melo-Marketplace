import { useFocusEffect } from "expo-router"
import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
  .eq("order_id", disputeId)
  .maybeSingle() // 🔥 FIX: prevents PGRST116 crash

      if (error) throw error

// 🛑 CRITICAL: handle null safely (maybeSingle can return null)
if (!data) {
  setDispute(null)
  return
}

// 🔒 Role security gate (MELO CRITICAL)
if (
  (role === "buyer" && data.buyer_id !== user.id) ||
  (role === "seller" && data.seller_id !== user.id)
) {
  setDispute(null)
  return
}

setDispute(data)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load dispute details.",
      })
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

  const isReturnDispute = (dispute as any).dispute_type === "return"

  const statusMeta = getStatusMeta(
    dispute.status,
    dispute.opened_by,
    isReturnDispute,
    role
  )

  /* 🧠 MELO ASYMMETRICAL RESPONSE LOGIC (CRITICAL FIX) */
  const otherPartyResponded =
    dispute.opened_by === "buyer"
      ? !!dispute.seller_responded_at
      : dispute.opened_by === "seller"
      ? !!dispute.buyer_responded_at
      : false

  const needsToRespond =
    !dispute.resolved_at &&
    (
      (role === "buyer" &&
        dispute.opened_by === "seller" &&
        !dispute.buyer_responded_at) ||
      (role === "seller" &&
        dispute.opened_by === "buyer" &&
        !dispute.seller_responded_at)
    )

  const showUnderReviewMessage =
    dispute.status === "under_review" && otherPartyResponded

  let guidanceMessage: string | null = null

  if (needsToRespond) {
    guidanceMessage =
      role === "buyer"
        ? "The seller has opened this dispute. Please submit your response and evidence. If no response is provided in a timely manner, a decision may be made based on the available evidence."
        : "The buyer has opened this dispute. Please submit your response and evidence. If no response is provided in a timely manner, a decision may be made based on the available evidence."
  } else if (showUnderReviewMessage) {
    guidanceMessage =
      "Both parties have submitted their evidence. Our admins will now review the case. If no further responses are required, a final decision will be made based on the evidence gathered. Escrow will remain frozen during this process."
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 🔥 SUMMARY CARD */}
      <View style={styles.card}>
        {/* 🧾 MELO ORDER NUMBER */}
        <Text style={styles.orderRef}>
          Order #{`Melo${dispute.order_id.slice(0, 6)}`}
        </Text>

        {/* STATUS BADGE */}
        <View
          style={[
            styles.badge,
            { backgroundColor: statusMeta.color },
          ]}
        >
          <Text style={styles.badgeText}>{statusMeta.label}</Text>
        </View>

        <Text style={styles.subtext}>{statusMeta.subtext}</Text>

        {/* 🧭 GUIDANCE MESSAGE */}
        {guidanceMessage ? (
          <View style={styles.guidanceBox}>
            <Text style={styles.guidanceText}>
              {guidanceMessage}
            </Text>
          </View>
        ) : null}

        {/* ---------- CLEAN DISPUTE DETAILS ---------- */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Dispute Reason</Text>
            <Text style={styles.detailValue}>
              {dispute.reason}
            </Text>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.detailDescription}>
              {dispute.description}
            </Text>
          </View>
        </View>
      </View>

      {/* 📸 BUYER EVIDENCE */}
      {dispute.buyer_evidence_urls?.length ? (
        <View style={styles.evidenceSection}>
          <Text style={styles.sectionTitle}>Buyer Evidence</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dispute.buyer_evidence_urls.map((url) => (
              <Image
                key={url}
                source={{ uri: url }}
                style={styles.evidenceImage}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* 📸 SELLER EVIDENCE */}
      {dispute.seller_evidence_urls?.length ? (
        <View style={styles.evidenceSection}>
          <Text style={styles.sectionTitle}>Seller Evidence</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dispute.seller_evidence_urls.map((url) => (
              <Image
                key={url}
                source={{ uri: url }}
                style={styles.evidenceImage}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DDEDE6",
  },
  orderRef: {
    fontWeight: "900",
    fontSize: 13,
    color: "#6B8F7D",
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  subtext: {
    color: "#6B8F7D",
    fontWeight: "600",
    marginBottom: 12,
  },
  guidanceBox: {
    backgroundColor: "#F4FAF7",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DDEDE6",
    marginBottom: 12,
  },
  guidanceText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F1E17",
    lineHeight: 18,
  },
  detailsCard: {
    marginTop: 12,
    backgroundColor: "#F8FBF9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E3EFEA",
    overflow: "hidden",
  },
  detailRow: {
    padding: 14,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6B8F7D",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F1E17",
  },
  detailDescription: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F1E17",
    lineHeight: 20,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#E3EFEA",
    marginHorizontal: 12,
  },
  sectionTitle: {
    fontWeight: "900",
    fontSize: 15,
    marginTop: 18,
    marginBottom: 10,
    color: "#0F1E17",
  },
  evidenceSection: {
    marginTop: 18,
  },
  evidenceImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: "#D6E6DE",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
})