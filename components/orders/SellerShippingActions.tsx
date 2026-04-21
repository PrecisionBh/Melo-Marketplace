import { StyleSheet, Text, View } from "react-native"

export default function SellerShippingActions({
  order,
}: {
  order: any
}) {
  const status = order.status
  const trackingStatus =
    order.tracking_status?.toLowerCase()

  const hasLabel = !!order.label_url
  const hasTracking = !!order.tracking_number

  const completed = status === "completed"

  const delivered =
    !completed &&
    (trackingStatus === "delivered" ||
      status === "delivered")

  const outForDelivery =
    !completed &&
    !delivered &&
    trackingStatus === "out_for_delivery"

  const inTransit =
    !completed &&
    !delivered &&
    !outForDelivery &&
    (status === "shipped" ||
      trackingStatus === "in_transit")

  /* ---------------- SELLER GUIDANCE ---------------- */

  const getSellerMessage = () => {
    // ❌ CANCELLED
    if (status === "cancelled") {
      return {
        title: "Order Cancelled",
        sub: "This order has been refunded. No further action is required.",
        type: "error",
      }
    }

    // ✅ COMPLETE
    if (status === "completed") {
      return {
        title: "Order Complete",
        sub: "Funds have been released. No further action is required.",
        type: "success",
      }
    }

    // 🔥 READY TO SHIP
    if (status === "paid" && !hasLabel && !hasTracking) {
      return {
        title: "Ready to Ship",
        sub: "Package the item and purchase a shipping label or add tracking to ship this order.",
        type: "notice",
      }
    }

    // 🔥 LABEL PURCHASED (BIG ONE YOU WERE MISSING)
    if (hasLabel && !inTransit && !outForDelivery && !delivered) {
      return {
        title: "Label Purchased",
        sub: "Print or scan the label and drop off the package with the carrier.",
        type: "notice",
      }
    }

    // 🚚 IN TRANSIT
    if (inTransit) {
      return {
        title: "In Transit",
        sub: "The package is on the way. No action required.",
        type: "notice",
      }
    }

    // 📦 OUT FOR DELIVERY
    if (outForDelivery) {
      return {
        title: "Out For Delivery",
        sub: "Package is arriving to the buyer today. No action required.",
        type: "notice",
      }
    }

    // 📬 DELIVERED
    if (delivered) {
      return {
        title: "Delivered",
        sub: "Waiting for buyer confirmation or return window. No action required.",
        type: "notice",
      }
    }

    // 🔄 FALLBACK (NEVER BLANK)
    return {
      title: "Processing Order",
      sub: "Monitor the order status. Further action may be required soon.",
      type: "notice",
    }
  }

  const message = getSellerMessage()

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Seller Actions
      </Text>

      <View
        style={[
          styles.noticeBox,
          message.type === "success" &&
            styles.successBox,
          message.type === "error" &&
            styles.errorBox,
        ]}
      >
        <Text
          style={[
            styles.noticeTitle,
            message.type === "success" &&
              styles.successTitle,
            message.type === "error" &&
              styles.errorTitle,
          ]}
        >
          {message.title}
        </Text>

        <Text
          style={[
            styles.noticeSub,
            message.type === "success" &&
              styles.successSub,
            message.type === "error" &&
              styles.errorSub,
          ]}
        >
          {message.sub}
        </Text>
      </View>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 16,
    marginBottom: 16,
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
    marginBottom: 14,
  },

  noticeBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 14,
  },

  noticeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563EB",
    marginBottom: 4,
  },

  noticeSub: {
    fontSize: 13,
    color: "#1D4ED8",
    lineHeight: 18,
  },

  successBox: {
    backgroundColor: "#ECFDF5",
  },

  successTitle: {
    color: "#16A34A",
  },

  successSub: {
    color: "#15803D",
  },

  errorBox: {
    backgroundColor: "#FEE2E2",
  },

  errorTitle: {
    color: "#DC2626",
  },

  errorSub: {
    color: "#991B1B",
  },
})