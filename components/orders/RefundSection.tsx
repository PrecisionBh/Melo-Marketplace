import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function RefundSection({
  order,
  refreshOrder,
  onRefund,
}: {
  order: any
  refreshOrder?: () => void
  onRefund?: () => void
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Complete Return
      </Text>

      <View style={styles.noticeBox}>
        <Text style={styles.noticeTitle}>
          Return Delivered
        </Text>

        <Text style={styles.noticeSub}>
          The returned package has been marked
          delivered. Confirm receipt to refund
          the buyer and close the order.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.refundBtn}
        onPress={onRefund}
      >
        <Text style={styles.refundText}>
          Confirm Return & Refund Buyer
        </Text>
      </TouchableOpacity>
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
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },

  noticeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
    marginBottom: 4,
  },

  noticeSub: {
    fontSize: 13,
    color: "#991B1B",
    lineHeight: 18,
  },

  refundBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },

  refundText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
})