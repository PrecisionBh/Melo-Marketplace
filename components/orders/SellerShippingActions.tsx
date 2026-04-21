import { useRouter } from "expo-router"
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export default function SellerShippingActions({
  order,
  refreshOrder,
  onAddTracking,
  onCancelOrder,
  onBuyLabel,
  onVoidLabel,
  loadingRates,
}: {
  order: any
  refreshOrder?: () => void
  onAddTracking?: () => void
  onCancelOrder?: () => void
  onBuyLabel?: () => void
  onVoidLabel?: () => void
  loadingRates?: boolean
}) {
  const router = useRouter()

  const status = order.status
  const trackingStatus =
    order.tracking_status?.toLowerCase()

  // 🔥 TRUE SOURCE OF STATE
  const hasLabel = !!order.label_url
  const hasTracking = !!order.tracking_number

  const canVoid =
    hasLabel && trackingStatus !== "in_transit"

  const canBuyLabel =
    status === "paid" && !hasLabel && !hasTracking

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

  // 🔥 SELLER GUIDANCE
  const getSellerMessage = () => {
    if (status === "cancelled") {
      return {
        title: "Order Cancelled",
        sub: "This order has been refunded. No further action is required.",
        type: "error",
      }
    }

    if (status === "completed") {
      return {
        title: "Order Complete",
        sub: "Funds have been released. No further action is required.",
        type: "success",
      }
    }

    if (!hasLabel && !hasTracking && status === "paid") {
      return {
        title: "Ready to Ship",
        sub: "Purchase a label or add tracking to ship this order.",
        type: "notice",
      }
    }

    if (inTransit) {
      return {
        title: "In Transit",
        sub: "The package is on the way to the buyer.",
        type: "notice",
      }
    }

    if (outForDelivery) {
      return {
        title: "Out For Delivery",
        sub: "Package is arriving to the buyer today.",
        type: "notice",
      }
    }

    if (delivered) {
      return {
        title: "Delivered",
        sub: "Waiting for buyer confirmation or return window.",
        type: "notice",
      }
    }

    return null
  }

  const message = getSellerMessage()

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Seller Actions
      </Text>

      {/* 🔥 GUIDANCE */}
      {message && (
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
      )}

      {/* 🔥 ACTIONS */}

      {/* BUY LABEL */}
      {canBuyLabel && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onBuyLabel}
          disabled={loadingRates}
        >
          {loadingRates ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              Buy Shipping Label
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* ADD TRACKING */}
      {!hasLabel && !hasTracking && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onAddTracking}
        >
          <Text style={styles.primaryText}>
            Add Tracking / Mark Shipped
          </Text>
        </TouchableOpacity>
      )}

      {/* 🔥 EASYPOST FLOW */}
      {hasLabel && (
        <>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() =>
              router.push({
                pathname: "/shippinglabel",
                params: { id: order.id },
              })
            }
          >
            <Text style={styles.primaryText}>
              View Label
            </Text>
          </TouchableOpacity>

          {canVoid && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onVoidLabel}
            >
              <Text style={styles.secondaryText}>
                Void Label
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* TRACK PACKAGE */}
      {!hasLabel && hasTracking && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            Linking.openURL(order.tracking_url)
          }
        >
          <Text style={styles.primaryText}>
            Track Package
          </Text>
        </TouchableOpacity>
      )}

      {/* CANCEL */}
      {status === "paid" && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onCancelOrder}
        >
          <Text style={styles.secondaryText}>
            Cancel / Refund Order
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

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
    marginBottom: 14,
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

  primaryBtn: {
    backgroundColor: "#D97732",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },

  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  secondaryBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DC2626",
    marginBottom: 10,
  },

  secondaryText: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 14,
  },
})