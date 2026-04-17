import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export default function BuyerActions({
  order,
  refreshOrder,
  onConfirmDelivery,
  onStartReturn,
}: {
  order: any
  refreshOrder?: () => void
  onConfirmDelivery?: () => void
  onStartReturn?: () => void
}) {
  const status = order.status
  const isPendingPayment = status === "pending_payment"

  const deliveredAt = order.delivered_at
    ? new Date(order.delivered_at)
    : null

  const now = new Date()

  const returnDeadline = deliveredAt
    ? new Date(
        deliveredAt.getTime() +
          2 * 24 * 60 * 60 * 1000
      )
    : null

  const isDelivered =
    order.tracking_status === "delivered"

  const returnWindowActive =
    returnDeadline &&
    now < returnDeadline &&
    isDelivered

  const hoursRemaining = returnDeadline
    ? Math.max(
        0,
        Math.floor(
          (returnDeadline.getTime() -
            now.getTime()) /
            (1000 * 60 * 60)
        )
      )
    : 0

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Buyer Actions
      </Text>

      {isPendingPayment && (
  <View style={styles.noticeBox}>
    <Text style={styles.noticeTitle}>
      Awaiting Payment
    </Text>

    <Text style={styles.noticeSub}>
      Complete your payment to proceed with this order.
    </Text>
  </View>
)}

      {returnWindowActive && (
        <>
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>
              Return Window Active
            </Text>

            <Text style={styles.noticeSub}>
              {hoursRemaining}h remaining to
              complete or return this order.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onConfirmDelivery}
          >
            <Text style={styles.primaryText}>
              Confirm Delivery / Complete Order
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onStartReturn}
          >
            <Text style={styles.secondaryText}>
              Start Return
            </Text>
          </TouchableOpacity>
        </>
      )}

      {status === "completed" && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            console.log("Leave Review")
          }
        >
          <Text style={styles.primaryText}>
            Leave Review
          </Text>
        </TouchableOpacity>
      )}

      {(status === "return_started" ||
        status === "return_processing") && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>
            Return In Progress
          </Text>

          <Text style={styles.noticeSub}>
            Follow return instructions below.
          </Text>
        </View>
      )}

      {order.is_disputed && (
        <View style={styles.disputeBox}>
          <Text style={styles.disputeTitle}>
            Dispute Open
          </Text>

          <Text style={styles.disputeSub}>
            This order is currently under
            review.
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
    backgroundColor: "#FFF7F1",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },

  noticeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#D97732",
    marginBottom: 4,
  },

  noticeSub: {
    fontSize: 13,
    color: "#8A5A32",
    lineHeight: 18,
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
    borderColor: "#D97732",
  },

  secondaryText: {
    color: "#D97732",
    fontWeight: "800",
    fontSize: 14,
  },

  disputeBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },

  disputeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
    marginBottom: 4,
  },

  disputeSub: {
    fontSize: 13,
    color: "#991B1B",
  },
})