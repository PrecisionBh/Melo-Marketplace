import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function SellerReturnDisputeCard({
  onOpenDispute,
}: {
  onOpenDispute?: () => void
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Problem With This Return?
      </Text>

      <Text style={styles.sub}>
        If the returned item is damaged,
        incorrect, or otherwise not as
        expected, you can open a dispute
        for admin review.
      </Text>

      <TouchableOpacity
        style={styles.disputeBtn}
        onPress={onOpenDispute}
      >
        <Text style={styles.disputeText}>
          Open Dispute
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FEF2F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 16,
    marginBottom: 16,
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#DC2626",
    marginBottom: 8,
  },

  sub: {
    fontSize: 13,
    color: "#991B1B",
    lineHeight: 18,
    marginBottom: 14,
  },

  disputeBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },

  disputeText: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 14,
  },
})