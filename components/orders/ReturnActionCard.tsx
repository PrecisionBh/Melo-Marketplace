import { supabase } from "@/lib/supabase"
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  orderId: string
  returnTrackingNumber?: string | null
  returnCarrier?: string | null
  trackingUploadedAt?: string | null
}

const AUTO_REFUND_DAYS = 5

export default function ReturnActionCard({
  orderId,
  returnTrackingNumber,
  returnCarrier,
  trackingUploadedAt,
}: Props) {
  const hasTracking = !!returnTrackingNumber

  const getTrackingUrl = () => {
    if (!returnTrackingNumber) return null

    if (returnCarrier === "UPS") {
      return `https://www.ups.com/track?tracknum=${returnTrackingNumber}`
    }
    if (returnCarrier === "USPS") {
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${returnTrackingNumber}`
    }
    if (returnCarrier === "FEDEX") {
      return `https://www.fedex.com/fedextrack/?tracknumbers=${returnTrackingNumber}`
    }

    return null
  }

  const handleTrack = async () => {
    const url = getTrackingUrl()
    if (!url) {
      Alert.alert("No tracking link available")
      return
    }
    await Linking.openURL(url)
  }

  const handleCompleteReturn = async () => {
    Alert.alert(
      "Complete Return",
      "Confirm item has been received and refund the buyer?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Refund Buyer",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("orders")
                .update({
                  status: "refunded",
                  refunded_at: new Date().toISOString(),
                })
                .eq("id", orderId)

              if (error) throw error

              Alert.alert("Refund issued successfully")
            } catch (err: any) {
              Alert.alert("Refund failed", err.message)
            }
          },
        },
      ]
    )
  }

  const isAutoRefundDue = () => {
    if (!trackingUploadedAt) return false
    const uploaded = new Date(trackingUploadedAt).getTime()
    const now = Date.now()
    const daysPassed = (now - uploaded) / (1000 * 60 * 60 * 24)
    return daysPassed >= AUTO_REFUND_DAYS
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Return In Progress</Text>

      {hasTracking ? (
        <>
          <Text style={styles.meta}>
            Tracking #: {returnTrackingNumber}
          </Text>

          <TouchableOpacity style={styles.trackBtn} onPress={handleTrack}>
            <Text style={styles.btnText}>Track Return</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.completeBtn}
            onPress={handleCompleteReturn}
          >
            <Text style={styles.btnText}>Complete Return & Refund</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.disputeBtn}>
            <Text style={styles.btnText}>Open Dispute</Text>
          </TouchableOpacity>

          {isAutoRefundDue() && (
            <Text style={styles.autoNote}>
              Auto-refund eligible (5+ days since tracking upload)
            </Text>
          )}
        </>
      ) : (
        <Text style={styles.waitingText}>
          Waiting for buyer to upload return tracking
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E3EFEA",
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    color: "#4F4F4F",
    marginBottom: 12,
  },
  waitingText: {
    fontSize: 13,
    color: "#C0392B",
    fontWeight: "700",
  },
  trackBtn: {
    backgroundColor: "#7FAF9B",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  completeBtn: {
    backgroundColor: "#1F7A63",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  disputeBtn: {
    backgroundColor: "#EB5757",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  autoNote: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B8F7D",
    fontWeight: "700",
  },
})
