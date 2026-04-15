import {
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
}: {
  order: any
  refreshOrder?: () => void
  onAddTracking?: () => void
  onCancelOrder?: () => void
}) {
  const status = order.status

  const canShip =
    status === "paid" ||
    status === "label_purchased"

  const shipped =
    status === "shipped" ||
    status === "in_transit"

  const delivered =
    status === "delivered"

  const completed =
    status === "completed"

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Seller Actions
      </Text>

      {canShip && (
        <>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onAddTracking}
          >
            <Text style={styles.primaryText}>
              Add Tracking / Mark Shipped
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onCancelOrder}
          >
            <Text style={styles.secondaryText}>
              Cancel / Refund Order
            </Text>
          </TouchableOpacity>
        </>
      )}

      {shipped && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>
            Tracking Submitted
          </Text>

          <Text style={styles.noticeSub}>
            Buyer has been notified and
            shipment is in transit.
          </Text>
        </View>
      )}

      {delivered && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>
            Delivered
          </Text>

          <Text style={styles.noticeSub}>
            Waiting for buyer to complete
            order or initiate return.
          </Text>
        </View>
      )}

      {completed && (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>
            Order Complete
          </Text>

          <Text style={styles.successSub}>
            Escrow has been released.
          </Text>
        </View>
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
    borderRadius: 16,
    padding: 14,
  },

  successTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#16A34A",
    marginBottom: 4,
  },

  successSub: {
    fontSize: 13,
    color: "#15803D",
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
  },

  secondaryText: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 14,
  },
})