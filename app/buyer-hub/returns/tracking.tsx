import { notify } from "@/lib/notifications/notify"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type Order = {
  id: string
  buyer_id: string
  seller_id: string
  status: string
  return_tracking_number: string | null
  return_tracking_url: string | null
  return_shipped_at: string | null
}

/* ---------------- HELPERS ---------------- */

const buildTrackingUrl = (carrier: string, tracking: string) => {
  const clean = tracking.trim()

  switch (carrier) {
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${clean}`
    case "UPS":
      return `https://www.ups.com/track?tracknum=${clean}`
    case "FedEx":
      return `https://www.fedex.com/fedextrack/?tracknumbers=${clean}`
    case "DHL":
      return `https://www.dhl.com/en/express/tracking.html?AWB=${clean}`
    default:
      return null
  }
}

/* ---------------- SCREEN ---------------- */

export default function ReturnTrackingScreen() {
  const { orderId: id } = useLocalSearchParams<{ orderId: string }>()
  const router = useRouter()
  const { session } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [carrier, setCarrier] = useState("")
  const [tracking, setTracking] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id || !session?.user?.id) {
      setLoading(false)
      return
    }
    loadOrder()
  }, [id, session?.user?.id])

  /* ---------------- LOAD ORDER (HARDENED) ---------------- */

  const loadOrder = async () => {
    try {
      if (!id || !session?.user?.id) {
        setLoading(false)
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          buyer_id,
          seller_id,
          status,
          return_tracking_number,
          return_tracking_url,
          return_shipped_at
        `)
        .eq("id", id)
        .single()

      if (error) throw error

      if (!data) {
        Alert.alert("Order not found")
        router.back()
        return
      }

      // 🔒 SECURITY: Only buyer can upload return tracking
      if (data.buyer_id !== session.user.id) {
        Alert.alert("Access denied", "You cannot update this return.")
        router.back()
        return
      }

      // 🔒 Must be in return state
      if (data.status !== "return_processing") {
        Alert.alert(
          "Invalid State",
          "Return tracking can only be added when a return is active."
        )
        router.back()
        return
      }

      setOrder(data as Order)
      setTracking(data.return_tracking_number ?? "")
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load return details.",
      })
      router.back()
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- SUBMIT RETURN TRACKING (HARDENED) ---------------- */

  const submitReturnTracking = async () => {
    if (!order || !session?.user?.id) {
      Alert.alert("Error", "Order data missing. Please reload.")
      return
    }

    // Rule C enforcement: block edits after tracking exists
    if (order.return_tracking_number) {
      Alert.alert(
        "Tracking Locked",
        "Return tracking has already been submitted and cannot be changed."
      )
      return
    }

    if (!carrier || !tracking.trim()) {
      Alert.alert(
        "Missing Information",
        "Please select a carrier and enter a valid tracking number."
      )
      return
    }

    try {
      setSaving(true)

      const trackingUrl = buildTrackingUrl(carrier, tracking)

      const { error } = await supabase
        .from("orders")
        .update({
          status: "return_processing", // 🔒 HARD ENFORCE RETURN STATE
          return_tracking_number: tracking.trim(),
          return_tracking_url: trackingUrl,
          return_shipped_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("buyer_id", session.user.id)

      if (error) throw error

      // 🔔 Notify seller (non-blocking)
      try {
        await notify({
          userId: order.seller_id,
          type: "order",
          title: "Return Shipped",
          body: "The buyer has shipped the return. Tracking is now available.",
          data: {
            route: "/seller-hub/orders/[id]",
            params: { id: order.id },
          },
        })
      } catch (notifyErr) {
        handleAppError(notifyErr, {
          fallbackMessage: "Tracking saved, but notification failed.",
        })
      }

      Alert.alert(
        "Return Tracking Submitted",
        "Your return has been marked as shipped. The seller will be notified and the refund process will begin after the item is received.",
        [
          {
            text: "OK",
            onPress: () => router.replace(`/buyer-hub/orders/${order.id}` as any),
          },
        ]
      )
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to submit return tracking. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 80 }} />
  }

  if (!order) return null

  const trackingLocked = !!order.return_tracking_number

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      <AppHeader
  title="Return Tracking"
  backRoute={`/buyer-hub/orders/${order.id}`}
/>

      <ScrollView contentContainerStyle={styles.content}>
        {/* INFO BOX */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>Important</Text>
          <Text style={styles.noticeText}>
            Please ship the item back securely and in the same condition it was
            received. Once tracking is submitted, the return cannot be cancelled.
          </Text>
        </View>

        {/* TRACKING SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Return Shipping</Text>

          {trackingLocked ? (
            <>
              <Text style={styles.infoText}>
                Carrier: Submitted
              </Text>
              <Text style={styles.infoText}>
                Tracking: {order.return_tracking_number}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.carrierRow}>
                {["USPS", "UPS", "FedEx", "DHL"].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.carrierBtn,
                      carrier === c && styles.carrierActive,
                    ]}
                    onPress={() => setCarrier(c)}
                  >
                    <Text
                      style={[
                        styles.carrierText,
                        carrier === c && styles.carrierTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                placeholder="Enter return tracking number"
                value={tracking}
                onChangeText={setTracking}
                style={styles.input}
                autoCapitalize="characters"
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* ACTION BAR */}
      {!trackingLocked && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (!carrier || !tracking.trim() || saving) &&
                styles.primaryDisabled,
            ]}
            disabled={!carrier || !tracking.trim() || saving}
            onPress={submitReturnTracking}
          >
            <Text style={styles.primaryText}>
              {saving ? "Submitting…" : "Submit Return Tracking"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

/* ---------------- STYLES (MATCH MELO THEME) ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },
  content: {
    padding: 18,
    paddingBottom: 140,
  },
  noticeBox: {
    backgroundColor: "#FFF7E6",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 6,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    color: "#5A4A2F",
  },
  section: {
    marginTop: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2EFE8",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
    color: "#0F1E17",
  },
  carrierRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  carrierBtn: {
    borderWidth: 1,
    borderColor: "#CFE6DD",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#F4FAF7",
  },
  carrierActive: {
    backgroundColor: "#7FAF9B",
    borderColor: "#7FAF9B",
  },
  carrierText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F1E17",
  },
  carrierTextActive: {
    color: "#FFFFFF",
  },
  input: {
    backgroundColor: "#F4FAF7",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#D6E6DE",
    fontSize: 14,
    fontWeight: "600",
    color: "#0F1E17",
  },
  infoText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2E5F4F",
    marginBottom: 4,
  },
  actionBar: {
    position: "absolute",
    bottom: 85,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
  },
  primaryBtn: {
    backgroundColor: "#0F1E17",
    paddingVertical: 16,
    borderRadius: 18,
  },
  primaryDisabled: {
    backgroundColor: "#A7C8BB",
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
    textAlign: "center",
  },
})
