import { Ionicons } from "@expo/vector-icons"
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  /* CONTROL FLAGS (SCREEN CONTROLS LOGIC — SAME PATTERN AS BUYER) */
  showAddTracking: boolean
  showTrackShipment: boolean
  showReturnSection: boolean
  hasReturnTracking: boolean
  showDispute: boolean // 🔁 RETURN DISPUTE (existing)

  /* 🆕 NEW DISPUTE FLAGS (NON-RETURN DISPUTES) */
  showRespondToDispute?: boolean
  showSeeDispute?: boolean

  /* DATA */
  trackingUrl: string | null
  returnTrackingUrl?: string | null
  processing: boolean

  /* ACTIONS */
  onAddTracking: () => void
  onOpenReturnDetails: () => void
  onDispute: () => void // existing (return dispute)
  onRespondToDispute?: () => void // 🆕 buyer opened dispute
  onSeeDispute?: () => void // 🆕 view dispute thread
}

export default function SellerOrderActionButtons({
  showAddTracking,
  showTrackShipment,
  showReturnSection,
  hasReturnTracking,
  showDispute,
  showRespondToDispute = false,
  showSeeDispute = false,
  trackingUrl,
  returnTrackingUrl,
  processing,
  onAddTracking,
  onOpenReturnDetails,
  onDispute,
  onRespondToDispute,
  onSeeDispute,
}: Props) {
  const handleTrackShipment = () => {
    if (!trackingUrl) return
    Linking.openURL(trackingUrl).catch(() => {
      console.warn("Invalid shipment tracking URL:", trackingUrl)
    })
  }

  const handleTrackReturn = () => {
    if (!returnTrackingUrl) return
    Linking.openURL(returnTrackingUrl).catch(() => {
      console.warn("Invalid return tracking URL:", returnTrackingUrl)
    })
  }

  return (
    <View>
      {/* 📦 ADD SHIPMENT TRACKING (SELLER PRIMARY ACTION) */}
      {showAddTracking && (
        <TouchableOpacity
          style={styles.addTrackingBtn}
          onPress={onAddTracking}
          disabled={processing}
        >
          <Ionicons name="cube-outline" size={18} color="#fff" />
          <Text style={styles.addTrackingText}>
            {processing ? "Saving…" : "Add Shipment Tracking"}
          </Text>
        </TouchableOpacity>
      )}

      {/* 🚚 TRACK SHIPMENT TO BUYER */}
      {showTrackShipment && (
        <TouchableOpacity
          style={styles.trackShipmentBtn}
          onPress={handleTrackShipment}
        >
          <Ionicons name="car-outline" size={18} color="#fff" />
          <Text style={styles.trackShipmentText}>
            Track Shipment
          </Text>
        </TouchableOpacity>
      )}

      {/* 🔁 RETURN FLOW (ESCROW FROZEN STATE) */}
      {showReturnSection && (
        <>
          {!hasReturnTracking && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Return Started</Text>
              <Text style={styles.infoText}>
                The buyer has started a return. Escrow is currently frozen until
                the return is resolved.
              </Text>
            </View>
          )}

          {hasReturnTracking && (
            <>
              <TouchableOpacity
                style={styles.trackReturnBtn}
                onPress={handleTrackReturn}
              >
                <Ionicons
                  name="return-down-back-outline"
                  size={18}
                  color="#fff"
                />
                <Text style={styles.trackReturnText}>
                  Track Incoming Return
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.returnDetailsBtn}
                onPress={onOpenReturnDetails}
              >
                <Ionicons name="eye-outline" size={18} color="#fff" />
                <Text style={styles.returnDetailsText}>
                  Accept Return - Issue Refund
                </Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}

      {/* 🧠 RETURN DISPUTE (SELLER FILES RETURN DISPUTE) */}
      {showDispute && (
        <TouchableOpacity style={styles.returnDisputeBtn} onPress={onDispute}>
          <Ionicons name="alert-circle-outline" size={18} color="#fff" />
          <Text style={styles.returnDisputeText}>
            File Return Dispute
          </Text>
        </TouchableOpacity>
      )}

      {/* 🔥 NEW: RESPOND TO DISPUTE (BUYER OPENED ISSUE) */}
      {showRespondToDispute && (
        <TouchableOpacity
          style={styles.respondDisputeBtn}
          onPress={onRespondToDispute}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
          <Text style={styles.respondDisputeText}>
            Respond to Dispute
          </Text>
        </TouchableOpacity>
      )}

      {/* 👁️ SEE DISPUTE (ALREADY RESPONDED OR SELLER CREATED) */}
      {showSeeDispute && !showRespondToDispute && (
        <TouchableOpacity
          style={styles.seeDisputeBtn}
          onPress={onSeeDispute}
        >
          <Ionicons name="eye-outline" size={18} color="#fff" />
          <Text style={styles.seeDisputeText}>
            See Dispute
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  addTrackingBtn: {
    marginTop: 18,
    backgroundColor: "#7FAF9B",
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addTrackingText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
  trackShipmentBtn: {
    marginTop: 14,
    backgroundColor: "#2F80ED",
    height: 46,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  trackShipmentText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
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
  returnDetailsBtn: {
    marginTop: 12,
    backgroundColor: "#F2994A",
    height: 46,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  returnDetailsText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  /* 🧠 RETURN DISPUTE (existing flow) */
  returnDisputeBtn: {
    marginTop: 14,
    backgroundColor: "#e58383",
    height: 46,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  returnDisputeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  /* 🔥 NEW BLACK & WHITE DISPUTE BUTTONS (NON-RETURN) */
  respondDisputeBtn: {
    marginTop: 14,
    backgroundColor: "#000000",
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  respondDisputeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
  seeDisputeBtn: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#000000",
    height: 46,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  seeDisputeText: {
    color: "#000000",
    fontWeight: "900",
    fontSize: 14,
  },

  infoBox: {
    marginTop: 16,
    backgroundColor: "#FFF4E5",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#8A5A00",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#8A5A00",
    fontWeight: "600",
    lineHeight: 18,
  },
})