import { Image } from "expo-image"
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

const SCREEN_WIDTH = Dimensions.get("window").width

type Props = {
  imageUrls?: string[] | null
  imageUrl?: string | null
  orderId: string
  title?: string | null
  status?: string
  isDisputed?: boolean | null
  hasReturnTracking?: boolean
}

export default function SellerOrderHeaderCard({
  imageUrls,
  imageUrl,
  orderId,
  title,
  status,
  isDisputed,
  hasReturnTracking = false,
}: Props) {
  /* ---------------- IMAGE NORMALIZATION ---------------- */

  const images =
    imageUrls && imageUrls.length > 0
      ? imageUrls
      : imageUrl
      ? [imageUrl]
      : []

  /* ---------------- ORDER NUMBER ---------------- */

  const displayOrderNumber =
    orderId?.startsWith("Melo")
      ? orderId
      : orderId
      ? `Melo${orderId.replace(/-/g, "").slice(0, 6)}`
      : "Melo------"

  /* ---------------- BADGE TEXT ---------------- */

  const getBadgeText = () => {
    if (!status) return ""

    if (status === "completed") return "COMPLETED"
    if (status === "refunded") return "REFUND PAID"
    if (status === "cancelled" || status === "cancelled_payment")
      return "CANCELLED"

    if (status === "disputed") return "ORDER DISPUTED"
    if (status === "issue_open") return "ISSUE OPEN"

    if (status === "return_processing") {
      if (isDisputed) return "RETURN DISPUTED – UNDER REVIEW"
      return "RETURN UNDER REVIEW"
    }

    if (status === "return_started") {
      if (hasReturnTracking) return "RETURN IN TRANSIT"
      return "RETURN STARTED"
    }

    if (status === "returned") return "RETURNED"

    if (status === "delivered") return "DELIVERED"
    if (status === "shipped") return "SHIPPED"

    if (status === "paid") return "PAID (ADD TRACKING)"
    if (status === "pending_payment") return "AWAITING PAYMENT"

    return status.replace(/_/g, " ").toUpperCase()
  }

  /* ---------------- BADGE STYLE ---------------- */

  const getBadgeStyle = () => {
    if (!status) return styles.badge

    if (status === "completed") return styles.completedBadge
    if (status === "refunded") return styles.refundedBadge

    if (status === "cancelled" || status === "cancelled_payment")
      return styles.cancelledBadge

    if (status === "disputed" || status === "issue_open")
      return styles.disputeBadge

    if (status === "return_processing") return styles.returnBadge
    if (status === "return_started") return styles.returnStartedBadge
    if (status === "returned") return styles.returnBadge

    if (status === "delivered") return styles.deliveredBadge
    if (status === "shipped") return styles.transitBadge

    if (status === "paid") return styles.actionRequiredBadge
    if (status === "pending_payment") return styles.pendingBadge

    return styles.badge
  }

  const badgeText = getBadgeText()

  return (
    <>
      {/* 🔥 IMAGE CAROUSEL (MATCHES LISTING + BUYER) */}
      {images.length === 0 ? (
        <View style={styles.imagePage} />
      ) : (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
        >
          {images.map((uri, i) => (
            <TouchableOpacity
              key={i}
              style={styles.imagePage}
              activeOpacity={1}
            >
              <Image
                source={uri}
                style={styles.image}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={100}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* CONTENT */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={styles.title}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title || "Untitled Listing"}
          </Text>

          {badgeText ? (
            <View style={[styles.badge, getBadgeStyle()]}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.orderNumber}>
          Order #{displayOrderNumber}
        </Text>
      </View>
    </>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  imagePage: {
    width: SCREEN_WIDTH,
    height: 260,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },

  image: {
    width: "100%",
    height: "100%",
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

  badge: {
    backgroundColor: "#7FAF9B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 0,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.3,
  },

  completedBadge: { backgroundColor: "#27AE60" },
  refundedBadge: { backgroundColor: "#1F7A63" },
  cancelledBadge: { backgroundColor: "#B91C1C" },

  disputeBadge: { backgroundColor: "#DC2626" },

  returnBadge: { backgroundColor: "#A855F7" },
  returnStartedBadge: { backgroundColor: "#9333EA" },

  deliveredBadge: { backgroundColor: "#1E7E34" },
  transitBadge: { backgroundColor: "#1A73E8" },

  actionRequiredBadge: { backgroundColor: "#F59E0B" },
  pendingBadge: { backgroundColor: "#9CA3AF" },
})