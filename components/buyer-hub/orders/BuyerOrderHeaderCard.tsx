import { Image, StyleSheet, Text, View } from "react-native"

type Props = {
  imageUrl: string | null
  orderId: string
  title?: string | null
  status?: string
  isDisputed?: boolean | null
  hasReturnTracking?: boolean
}

export default function BuyerOrderHeaderCard({
  imageUrl,
  orderId,
  title,
  status,
  isDisputed,
  hasReturnTracking = false,
}: Props) {
  const displayOrderNumber = orderId
  ? `Melo${orderId.replace(/-/g, "").slice(0, 6)}`
  : "Melo------"

  const getBadgeText = () => {
    if (!status) return ""

    if (status === "completed") return "COMPLETED"

    if (status === "paid") return "AWAITING SELLER SHIPMENT"

    if (status === "shipped") return "SHIPPED"

    if (status === "return_started" || status === "return_processing") {
      if (isDisputed) return "RETURN DISPUTED BY SELLER"
      if (hasReturnTracking)
        return "RETURN SHIPPED (AWAITING SELLER)"
      return "RETURN STARTED (AWAITING BUYER SHIPMENT)"
    }

    if (status === "disputed") return "DISPUTED"

    return status.replace("_", " ").toUpperCase()
  }

  const isCompleted = status === "completed"
  const badgeText = getBadgeText()

  return (
    <>
      <Image
        source={{ uri: imageUrl ?? undefined }}
        style={styles.image}
      />

      <View style={styles.content}>
        {/* 🔥 TITLE + BADGE (PRIMARY ROW) */}
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
              ]}
            >
              <Text style={styles.badgeText}>
                {badgeText}
              </Text>
            </View>
          ) : null}
        </View>

        {/* 🔽 ORDER NUMBER (SECONDARY META) */}
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
    gap: 8, // prevents title from touching badge
  },

  title: {
    flex: 1, // 🔥 THIS enables ellipsis properly
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
    flexShrink: 0, // prevents badge from squishing
  },

  completedBadge: {
    backgroundColor: "#27AE60",
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#fff",
  },
})
