import { Image, StyleSheet, Text, View } from "react-native"

type Props = {
  imageUrl: string | null
  orderId: string
  title?: string | null
  status?: string
  isDisputed?: boolean | null
  hasReturnTracking?: boolean
}

export default function SellerOrderHeaderCard({
  imageUrl,
  orderId,
  title,
  status,
  isDisputed,
  hasReturnTracking = false,
}: Props) {
  // 🔥 GLOBAL MELO ORDER NUMBER STANDARD (NO DOUBLE PREFIX BUG)
  const displayOrderNumber =
    orderId?.startsWith("Melo")
      ? orderId // already formatted from DB (CORRECT)
      : orderId
      ? `Melo${orderId.replace(/-/g, "").slice(0, 6)}`
      : "Melo------"

  const getBadgeText = () => {
    if (!status) return ""

    // 🟢 HIGHEST PRIORITY — REFUND STATE (ESCROW FINAL)
    if (status === "refunded") return "REFUND PAID"

    // 💰 COMPLETED = payout released to seller
    if (status === "completed") return "COMPLETED (PAID OUT)"

    // 📦 NORMAL ORDER FLOW
    if (status === "paid") return "AWAITING YOUR SHIPMENT"

    if (status === "shipped") return "SHIPPED TO BUYER"

    // 🔁 RETURN FLOW (CRITICAL FOR MELO ESCROW LOGIC)
    if (status === "return_processing") {
      if (isDisputed) return "RETURN DISPUTED – UNDER REVIEW"
      return "RETURN UNDER REVIEW"
    }

    if (status === "return_started") {
      if (hasReturnTracking)
        return "RETURN IN TRANSIT (BACK TO YOU)"
      return "RETURN STARTED (AWAITING BUYER SHIPMENT)"
    }

    // ⚠️ DISPUTE STATE
    if (status === "disputed") return "ORDER DISPUTED"

    // 🔤 FALLBACK (SAFETY)
    return status.replace(/_/g, " ").toUpperCase()
  }

  const isCompleted = status === "completed"
  const isRefunded = status === "refunded"
  const badgeText = getBadgeText()

  return (
    <>
      <Image
        source={{ uri: imageUrl ?? undefined }}
        style={styles.image}
      />

      <View style={styles.content}>
        {/* 🔥 TITLE + BADGE ROW */}
        <View style={styles.topRow}>
          <Text
            style={styles.title}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title || "Untitled Listing"}
          </Text>

          {badgeText ? (
            <View
              style={[
                styles.badge,
                isCompleted && styles.completedBadge,
                isRefunded && styles.refundedBadge,
              ]}
            >
              <Text style={styles.badgeText}>
                {badgeText}
              </Text>
            </View>
          ) : null}
        </View>

        {/* 🔽 MELO ORDER NUMBER (CONSISTENT ACROSS BUYER + SELLER) */}
        <Text style={styles.orderNumber}>
          Order #{displayOrderNumber}
        </Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: 260,
    resizeMode: "cover",
  },

  content: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    color: "#0F1E17",
    marginRight: 8,
  },

  orderNumber: {
    fontSize: 13,
    color: "#6B8F7D",
    fontWeight: "700",
    marginTop: 4,
  },

  /* 🟩 DEFAULT BADGE (Melo Theme) */
  badge: {
    backgroundColor: "#7FAF9B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 0,
  },

  /* 💰 PAID OUT (SUCCESS) */
  completedBadge: {
    backgroundColor: "#27AE60",
  },

  /* 🧾 REFUND PAID (ESCROW CLOSED – DIFFERENT SUCCESS STATE) */
  refundedBadge: {
    backgroundColor: "#1F7A63", // deeper Melo green for refunds
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#fff",
  },
})