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

export default function BuyerOrderHeaderCard({
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

  const formatMeloOrderNumber = (id?: string) => {
    if (!id) return "Melo------"
    if (id.startsWith("Melo")) return id
    if (/^[0-9]+$/.test(id)) return `Melo${id}`
    return `Melo${id.replace(/-/g, "").slice(0, 6)}`
  }

  const displayOrderNumber = formatMeloOrderNumber(orderId)

  /* ---------------- BADGE TEXT ---------------- */

  const getBadgeText = () => {
    if (!status) return ""

    if (status === "completed") return "COMPLETED"
    if (status === "refunded") return "REFUNDED"
    if (status === "cancelled" || status === "cancelled_payment")
      return "CANCELLED"

    if (status === "disputed") return "DISPUTED"
    if (status === "issue_open") return "ISSUE OPEN"

    if (status === "return_processing") {
      if (isDisputed) return "RETURN DISPUTED"
      return "RETURN UNDER REVIEW"
    }

    if (status === "return_started") {
      if (hasReturnTracking) return "RETURN IN TRANSIT"
      return "RETURN STARTED"
    }

    if (status === "returned") return "RETURNED"

    if (status === "delivered") return "DELIVERED"
    if (status === "shipped") return "SHIPPED"

    if (status === "paid") return "AWAITING SHIPMENT"
    if (status === "pending_payment") return "AWAITING PAYMENT"

    return status.replace(/_/g, " ").toUpperCase()
  }

  const badgeText = getBadgeText()

  return (
    <>
      {/* 🔥 EXACT SAME STRUCTURE AS LISTING SCREEN */}
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
          <Text style={styles.title} numberOfLines={1}>
            {title || "Untitled Listing"}
          </Text>

          {badgeText ? (
            <View style={styles.badge}>
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
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#fff",
  },
})