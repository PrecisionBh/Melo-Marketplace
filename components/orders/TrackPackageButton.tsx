import { useRouter } from "expo-router"
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

type Props = {
  order: any
  onAddTracking?: () => void
  onBuyLabel?: () => void
  onVoidLabel?: () => void
  onCancelOrder?: () => void
  loadingRates?: boolean
}

export default function TrackPackageButton({
  order,
  onAddTracking,
  onBuyLabel,
  onVoidLabel,
  onCancelOrder,
  loadingRates,
}: Props) {
  const router = useRouter()

  const status = order.status
  const trackingStatus =
    order.tracking_status?.toLowerCase()

  const hasLabel = !!order.label_url
  const hasTracking = !!order.tracking_number

  const canAddTracking =
    status === "paid" && !hasLabel && !hasTracking

  const canBuyLabel =
    status === "paid" && !hasLabel && !hasTracking

  const canVoid =
    hasLabel && trackingStatus !== "in_transit"

  const canCancel =
    status === "paid"

  const showTrackPackage =
    hasTracking && !!order.tracking_url

  const showViewLabel = hasLabel

  /* ---------------- ACTIONS ---------------- */

  const openTracking = async () => {
    if (!order.tracking_url) return
    await Linking.openURL(order.tracking_url)
  }

  const openLabel = () => {
    console.log("🚀 NAV ID:", order?.id)
    router.push(`/shippinglabel/${order.id}`)
  }

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.container}>
      {/* 🔥 ADD TRACKING */}
      {canAddTracking && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onAddTracking}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryText}>
            Add Tracking / Mark Shipped
          </Text>
        </TouchableOpacity>
      )}

      {/* 🔥 BUY LABEL */}
      {canBuyLabel && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onBuyLabel}
          disabled={loadingRates}
          activeOpacity={0.85}
        >
          {loadingRates ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              Buy Shipping Label
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* 🔥 VIEW LABEL */}
      {showViewLabel && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={openLabel}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryText}>
            View Label
          </Text>
        </TouchableOpacity>
      )}

      {/* 🔥 VOID LABEL */}
      {hasLabel && canVoid && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onVoidLabel}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryText}>
            Void Label
          </Text>
        </TouchableOpacity>
      )}

      {/* 🔥 TRACK PACKAGE */}
      {showTrackPackage && !hasLabel && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={openTracking}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryText}>
            Track Package
          </Text>
        </TouchableOpacity>
      )}

      {/* 🔥 CANCEL ORDER */}
      {canCancel && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onCancelOrder}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryText}>
            Cancel / Refund Order
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

/* ---------------- STYLES (BASE44) ---------------- */

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    marginBottom: 14,
  },

  primaryBtn: {
    backgroundColor: "#D97732",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },

  primaryText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },

  secondaryText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "800",
  },
})