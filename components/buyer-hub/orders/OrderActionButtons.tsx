import { Ionicons } from "@expo/vector-icons"
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  /* CONTROL FLAGS (ALL LOGIC COMES FROM SCREEN) */
  showTrack: boolean
  showConfirmDelivery: boolean
  showStartReturn: boolean
  showReturnSection: boolean
  hasReturnTracking: boolean
  showCancelOrder: boolean
  showDispute: boolean
  showLeaveReview: boolean
  showSeeDispute?: boolean // 🔥 NEW (optional & safe)

  /* DATA */
  trackingUrl: string | null
  processing: boolean

  /* ACTIONS */
  onConfirmDelivery: () => void
  onStartReturn: () => void
  onAddReturnTracking: () => void
  onCancelReturn: () => void
  onCancelOrder: () => void
  onDispute: () => void
  onLeaveReview: () => void
  onSeeDispute?: () => void // 🔥 NEW
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
  showSeeDispute, // 🔥 NEW
  trackingUrl,
  processing,
  onConfirmDelivery,
  onStartReturn,
  onAddReturnTracking,
  onCancelReturn,
  onCancelOrder,
  onDispute,
  onLeaveReview,
  onSeeDispute, // 🔥 NEW
}: Props) {
  const handleTrack = () => {
    if (!trackingUrl) return
    Linking.openURL(trackingUrl).catch(() => {
      console.warn("Invalid tracking URL:", trackingUrl)
    })
  }

  return (
    <View>
      {/* TRACK PACKAGE (ONLY when NOT in return flow — controlled by screen) */}
      {showTrack && !showReturnSection && (
        <TouchableOpacity style={styles.trackBtn} onPress={handleTrack}>
          <Ionicons name="car-outline" size={18} color="#fff" />
          <Text style={styles.trackText}>Track Package</Text>
        </TouchableOpacity>
      )}

      {/* CONFIRM DELIVERY */}
      {showConfirmDelivery && (
        <TouchableOpacity
          style={styles.completeBtn}
          onPress={onConfirmDelivery}
          disabled={processing}
        >
          <Text style={styles.completeText}>
            {processing ? "Processing…" : "Confirm Delivery"}
          </Text>
        </TouchableOpacity>
      )}

      {/* START RETURN */}
      {showStartReturn && (
        <TouchableOpacity style={styles.returnBtn} onPress={onStartReturn}>
          <Ionicons name="return-down-back-outline" size={18} color="#fff" />
          <Text style={styles.returnText}>Start a Return</Text>
        </TouchableOpacity>
      )}

      {/* RETURN FLOW SECTION */}
      {showReturnSection && (
        <>
          {/* NO TRACKING YET → Allow upload + cancel */}
          {!hasReturnTracking && (
            <>
              {/* Upload Return Tracking */}
              <TouchableOpacity
                style={styles.uploadTrackingBtn}
                onPress={onAddReturnTracking}
              >
                <Ionicons name="barcode-outline" size={18} color="#fff" />
                <Text style={styles.uploadTrackingText}>
                  Upload Return Tracking
                </Text>
              </TouchableOpacity>

              {/* Cancel Return (ONLY before tracking exists) */}
              <TouchableOpacity
                style={styles.cancelReturnBtn}
                onPress={onCancelReturn}
                disabled={processing}
              >
                <Ionicons name="close-circle-outline" size={18} color="#fff" />
                <Text style={styles.cancelReturnText}>
                  {processing ? "Processing…" : "Cancel Return"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.returnNote}>
                Please upload your return tracking so the seller can monitor the
                shipment. If you cancel the return, escrow will be released to
                the seller.
              </Text>
            </>
          )}

          {/* TRACKING EXISTS → LOCK RETURN (NO CANCEL BUTTON) */}
          {hasReturnTracking && (
            <>
              {/* Track Your Return */}
              <TouchableOpacity
                style={styles.trackReturnBtn}
                onPress={handleTrack}
              >
                <Ionicons name="cube-outline" size={18} color="#fff" />
                <Text style={styles.trackReturnText}>Track Your Return</Text>
              </TouchableOpacity>

              <Text style={styles.returnNote}>
                Your return is in transit. Once the seller receives the item,
                your refund will be processed automatically. Escrow is currently
                frozen during the return process.
              </Text>
            </>
          )}
        </>
      )}

      {/* LEAVE REVIEW */}
      {showLeaveReview && (
        <TouchableOpacity style={styles.reviewBtn} onPress={onLeaveReview}>
          <Ionicons name="star" size={18} color="#fffb00" />
          <Text style={styles.reviewText}>Leave a Review</Text>
        </TouchableOpacity>
      )}

      {/* CANCEL ORDER */}
      {showCancelOrder && (
        <TouchableOpacity
          style={styles.cancelOrderBtn}
          onPress={onCancelOrder}
          disabled={processing}
        >
          <Text style={styles.cancelOrderText}>
            {processing ? "Cancelling…" : "Cancel Order"}
          </Text>
        </TouchableOpacity>
      )}

      {/* DISPUTE */}
      {showDispute && (
        <TouchableOpacity style={styles.disputeBtn} onPress={onDispute}>
          <Ionicons name="alert-circle-outline" size={18} color="#fff" />
          <Text style={styles.disputeText}>Report an Issue</Text>
        </TouchableOpacity>
      )}

      {/* 🔥 SEE DISPUTE (BLACK & WHITE — LOCKED STATE AFTER DISPUTE FILED) */}
      {showSeeDispute && onSeeDispute && (
        <TouchableOpacity
          style={styles.seeDisputeBtn}
          onPress={onSeeDispute}
        >
          <Ionicons name="document-text-outline" size={18} color="#000" />
          <Text style={styles.seeDisputeText}>See Dispute</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  trackBtn: {
    marginTop: 18,
    backgroundColor: "#7FAF9B",
    height: 46,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  trackText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  returnBtn: {
    marginTop: 14,
    backgroundColor: "#F2994A",
    height: 46,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  returnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  uploadTrackingBtn: {
    marginTop: 18,
    backgroundColor: "#7FAF9B",
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadTrackingText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
  trackReturnBtn: {
    marginTop: 18,
    backgroundColor: "#9B51E0",
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  trackReturnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
  cancelReturnBtn: {
    marginTop: 14,
    backgroundColor: "#D64545",
    height: 46,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cancelReturnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
  completeBtn: {
    marginTop: 14,
    backgroundColor: "#27AE60",
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  completeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
  disputeBtn: {
    marginTop: 14,
    backgroundColor: "#e58383",
    height: 46,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disputeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  reviewBtn: {
    marginTop: 16,
    backgroundColor: "#7FAF9B",
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  reviewText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 15,
  },
  cancelOrderBtn: {
    marginTop: 14,
    backgroundColor: "#D64545",
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelOrderText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
  returnNote: {
    marginTop: 10,
    fontSize: 13,
    color: "#6B8F7D",
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
  },

  /* 🔥 NEW: BLACK & WHITE DISPUTE BUTTON */
  seeDisputeBtn: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#000000",
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  seeDisputeText: {
    color: "#000000",
    fontWeight: "900",
    fontSize: 15,
  },
})