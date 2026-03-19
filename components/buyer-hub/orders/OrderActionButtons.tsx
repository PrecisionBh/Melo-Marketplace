import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  showTrack: boolean
  showConfirmDelivery: boolean
  showStartReturn: boolean
  showReturnSection: boolean
  hasReturnTracking: boolean
  showCancelOrder: boolean
  showDispute: boolean
  showLeaveReview: boolean
  showSeeDispute?: boolean

  trackingUrl: string | null
  processing: boolean

  onConfirmDelivery: () => void
  onStartReturn: () => void
  onAddReturnTracking: () => void
  onCancelReturn: () => void
  onCancelOrder: () => void
  onDispute: () => void
  onLeaveReview: () => void
  onSeeDispute?: () => void
}

export default function OrderActionButtons({
  showTrack,
  showConfirmDelivery,
  showStartReturn,
  showReturnSection,
  hasReturnTracking,
  showCancelOrder,
  showDispute,
  showLeaveReview,
  showSeeDispute,
  trackingUrl,
  processing,
  onConfirmDelivery,
  onStartReturn,
  onAddReturnTracking,
  onCancelReturn,
  onCancelOrder,
  onDispute,
  onLeaveReview,
  onSeeDispute,
}: Props) {
  const handleTrack = () => {
    if (!trackingUrl) return
    Linking.openURL(trackingUrl).catch(() => {})
  }

  return (
    <View style={styles.grid}>
      {/* TRACK */}
      {showTrack && !showReturnSection && (
        <TouchableOpacity style={styles.greenBtn} onPress={handleTrack}>
          <Text style={styles.btnText}>Track Package</Text>
        </TouchableOpacity>
      )}

      {/* CONFIRM */}
      {showConfirmDelivery && (
        <TouchableOpacity
          style={styles.greenBtn}
          onPress={onConfirmDelivery}
          disabled={processing}
        >
          <Text style={styles.btnText}>
            {processing ? "Processing…" : "Confirm Delivery"}
          </Text>
        </TouchableOpacity>
      )}

      {/* START RETURN */}
      {showStartReturn && (
        <TouchableOpacity style={styles.blackBtn} onPress={onStartReturn}>
          <Text style={styles.btnText}>Start Return</Text>
        </TouchableOpacity>
      )}

      {/* DISPUTE */}
      {showDispute && (
        <TouchableOpacity style={styles.blackBtn} onPress={onDispute}>
          <Text style={styles.btnText}>Report Issue</Text>
        </TouchableOpacity>
      )}

      {/* RETURN FLOW */}
      {showReturnSection && !hasReturnTracking && (
        <>
          <TouchableOpacity style={styles.greenBtn} onPress={onAddReturnTracking}>
            <Text style={styles.btnText}>Upload Return Tracking</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.redBtn}
            onPress={onCancelReturn}
            disabled={processing}
          >
            <Text style={styles.btnText}>
              {processing ? "Processing…" : "Cancel Return"}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {showReturnSection && hasReturnTracking && (
        <TouchableOpacity style={styles.greenBtn} onPress={handleTrack}>
          <Text style={styles.btnText}>Track Return</Text>
        </TouchableOpacity>
      )}

      {/* CANCEL ORDER */}
      {showCancelOrder && (
        <TouchableOpacity
          style={styles.redBtn}
          onPress={onCancelOrder}
          disabled={processing}
        >
          <Text style={styles.btnText}>
            {processing ? "Cancelling…" : "Cancel Order"}
          </Text>
        </TouchableOpacity>
      )}

      {/* REVIEW */}
      {showLeaveReview && (
        <TouchableOpacity style={styles.greenBtn} onPress={onLeaveReview}>
          <Text style={styles.btnText}>Leave Review</Text>
        </TouchableOpacity>
      )}

      {/* SEE DISPUTE */}
      {showSeeDispute && onSeeDispute && (
        <TouchableOpacity style={styles.outlineBtn} onPress={onSeeDispute}>
          <Text style={styles.outlineText}>View Dispute</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },

  /* BASE BUTTON */
  btn: {
    width: "48%",
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    textAlign: "center",
  },

  /* COLORS */
  greenBtn: {
    width: "48%",
    height: 46,
    borderRadius: 12,
    backgroundColor: "#7FAF9B",
    alignItems: "center",
    justifyContent: "center",
  },

  blackBtn: {
    width: "48%",
    height: 46,
    borderRadius: 12,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },

  redBtn: {
    width: "48%",
    height: 46,
    borderRadius: 12,
    backgroundColor: "#D64545",
    alignItems: "center",
    justifyContent: "center",
  },

  outlineBtn: {
    width: "48%",
    height: 46,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#000",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  outlineText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 13,
  },
})