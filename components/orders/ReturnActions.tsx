import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export default function ReturnActions({
  order,
  refreshOrder,
}: {
  order: any
  refreshOrder?: () => void
}) {
  const hasReturnTracking =
    !!order.return_tracking_number

  const isProcessing =
    order.status === "return_processing"

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Return Status
      </Text>

      <View style={styles.noticeBox}>
        <Text style={styles.noticeTitle}>
          Return In Progress
        </Text>

        <Text style={styles.noticeSub}>
          {hasReturnTracking
            ? "Return tracking has been uploaded and is currently in transit."
            : "Awaiting buyer to upload return tracking information."}
        </Text>
      </View>

      {hasReturnTracking && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            console.log("Track Return Package")
          }
        >
          <Text style={styles.primaryText}>
            Track Return Package
          </Text>
        </TouchableOpacity>
      )}

      {!hasReturnTracking && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() =>
            console.log("Upload Return Tracking")
          }
        >
          <Text style={styles.secondaryText}>
            Upload Return Tracking
          </Text>
        </TouchableOpacity>
      )}

      {isProcessing && (
        <View style={styles.processingBox}>
          <Text style={styles.processingTitle}>
            Processing Return
          </Text>

          <Text style={styles.processingSub}>
            Seller is reviewing the returned item.
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
    marginBottom: 10,
  },

  secondaryText: {
    color: "#D97732",
    fontWeight: "800",
    fontSize: 14,
  },

  processingBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
  },

  processingTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
    marginBottom: 4,
  },

  processingSub: {
    fontSize: 13,
    color: "#991B1B",
  },
})