import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function BuyerDisputeResponseCard({
  onRespond,
}: {
  onRespond?: () => void
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Seller Has Disputed Your Return
      </Text>

      <Text style={styles.sub}>
        The seller has reported an issue
        with your returned item. Please
        respond with any relevant details
        or supporting photos for admin
        review.
      </Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={onRespond}
      >
        <Text style={styles.btnText}>
          Respond To Dispute
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF7ED",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#FDE7D3",
    padding: 16,
    marginBottom: 16,
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#D97732",
    marginBottom: 8,
  },

  sub: {
    fontSize: 13,
    color: "#8A5A32",
    lineHeight: 18,
    marginBottom: 14,
  },

  btn: {
    backgroundColor: "#D97732",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
})