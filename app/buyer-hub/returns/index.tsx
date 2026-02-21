import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { notify } from "@/lib/notifications/notify"
import { supabase } from "@/lib/supabase"


/* ---------------- TYPES ---------------- */

type Order = {
  id: string
  buyer_id: string
  seller_id: string
  status: string
  listing_snapshot?: {
    title?: string | null
  } | null
}

/* ---------------- CONSTANTS ---------------- */

const RETURN_REASONS = [
  "Item not as described",
  "Damaged item",
  "Wrong item received",
  "Changed my mind",
  "Other",
]

/* ---------------- SCREEN ---------------- */

export default function ReturnInitiateScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ orderId?: string }>()
  const orderId = params?.orderId

  const { session } = useAuth()
  const user = session?.user

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [reason, setReason] = useState<string>(RETURN_REASONS[0])
  const [notes, setNotes] = useState("")

  /* ---------------- FETCH ORDER ---------------- */

  useEffect(() => {
    if (!orderId || !user?.id) {
      setLoading(false)
      return
    }
    fetchOrder()
  }, [orderId, user?.id])

  const fetchOrder = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          buyer_id,
          seller_id,
          status,
          listing_snapshot
        `)
        .eq("id", orderId)
        .single()

      if (error) throw error

      if (!data) {
        Alert.alert("Error", "Order not found.")
        router.back()
        return
      }

      const safeOrder = data as Order

      // Security: Ensure buyer owns the order
      if (safeOrder.buyer_id !== user?.id) {
        Alert.alert(
          "Access Denied",
          "You are not authorized to start a return for this order."
        )
        router.back()
        return
      }

      // 🚫 Block invalid lifecycle states (final, return, dispute, cancelled)
      if (
        [
          "return_started",
          "return_processing",
          "disputed",
          "completed", // 🔒 FINAL state - protects seller
          "cancelled",
        ].includes(safeOrder.status)
      ) {
        const message =
          safeOrder.status === "completed"
            ? "This order has been completed and is no longer eligible for returns."
            : "This order is already in a return or dispute process."

        Alert.alert("Return Not Available", message)
        router.back()
        return
      }

      // ✅ Only allow returns after shipment and before completion
      if (safeOrder.status !== "shipped") {
        Alert.alert(
          "Return Not Available",
          "Returns can only be initiated after the item has been shipped and before the order is completed."
        )
        router.back()
        return
      }

      setOrder(safeOrder)
    } catch (err: any) {
      console.error("Return fetch order error:", err)
      Alert.alert(
        "Error",
        err?.message || "Failed to load order."
      )
      router.back()
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- START RETURN ---------------- */

  const handleStartReturn = async () => {
    if (!order || !user?.id) return

    try {
      setSubmitting(true)

      if (!reason) {
        Alert.alert(
          "Missing Reason",
          "Please select a return reason."
        )
        return
      }

      // 🔒 IMPORTANT: DB trigger will freeze escrow (NOT the app)
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "return_started",
          return_reason: reason,
          return_notes: notes.trim() || null,
          return_requested_at: new Date().toISOString(),
          return_deadline: new Date(
            Date.now() + 72 * 60 * 60 * 1000
          ).toISOString(), // ⏰ 72 hour buyer timer
        })
        .eq("id", order.id)
        .eq("buyer_id", user.id)
        .eq("status", "shipped") // 🛡️ prevents race conditions & stale UI updates

      if (updateError) throw updateError

      // 🔔 Notify seller (use unified Melo notification system)
      try {
        await notify({
          userId: order.seller_id,
          type: "order",
          title: "Return Initiated",
          body:
            "The buyer has initiated a return. Please await the return shipment.",
          data: {
            route: "/seller-hub/orders/[id]",
            params: { id: order.id },
          },
        })
      } catch (notifyErr) {
        console.warn(
          "Return notification failed (non-blocking):",
          notifyErr
        )
      }

      const redirectId = order.id

      Alert.alert(
        "Return Started",
        "Your return has been initiated. Escrow funds are now frozen pending return review.",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace(`/buyer-hub/orders/${redirectId}` as any),
          },
        ]
      )
    } catch (err: any) {
      console.error("Start return error:", err)
      Alert.alert(
        "Error",
        err?.message ||
          "Failed to start return. Please try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------------- LOADING STATE ---------------- */

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#EAF4EF" }}>
        <AppHeader title="Start Return" backRoute="/buyer-hub/orders" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 10, fontSize: 14 }}>
            Loading return details...
          </Text>
        </View>
      </View>
    )
  }

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: "#EAF4EF" }}>
        <AppHeader title="Start Return" backRoute="/buyer-hub/orders" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>
            Unable to load order.
          </Text>
        </View>
      </View>
    )
  }

  const listingTitle =
    order.listing_snapshot?.title || "Listing"

  /* ---------------- UI ---------------- */

  return (
    <View style={{ flex: 1, backgroundColor: "#EAF4EF" }}>
      <AppHeader
        title="Start Return"
        backRoute={`/buyer-hub/orders/${order.id}`}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Order Info */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#eee",
            }}
          >
            <Text style={{ fontSize: 12, color: "#777", fontWeight: "600" }}>
              Order ID
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "500", marginTop: 2 }}>
              {order.id}
            </Text>

            <Text style={{ fontSize: 12, color: "#777", fontWeight: "600", marginTop: 10 }}>
              Item
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "500", marginTop: 2 }}>
              {listingTitle}
            </Text>
          </View>

          {/* Instructions */}
          <View
            style={{
              backgroundColor: "#FFF7E6",
              borderRadius: 12,
              padding: 14,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "#FFE0B2",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", marginBottom: 4 }}>
              Important
            </Text>
            <Text style={{ fontSize: 13, lineHeight: 18, color: "#5A4A2F" }}>
              Starting a return will freeze the escrow and notify the seller. Please ensure the item is securely packaged and returned in the same condition it was received. You must upload a valid return tracking number within 72 hours of submitting the return request, or the escrowed payment will be released to the seller.
            </Text>
          </View>

          {/* Reason Selection */}
          <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 10 }}>
            Reason for Return
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 20,
            }}
          >
            {RETURN_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: reason === r ? "#7FAF9B" : "#ccc",
                  backgroundColor: reason === r ? "#7FAF9B" : "transparent",
                }}
                onPress={() => setReason(r)}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: reason === r ? "#fff" : "#000",
                  }}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 10 }}>
            Additional Details (Optional)
          </Text>

          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 12,
              padding: 12,
              textAlignVertical: "top",
              backgroundColor: "#fff",
              marginBottom: 24,
            }}
            placeholder="Provide any additional information about the return..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={5}
            maxLength={1000}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={{
              backgroundColor: "#7FAF9B",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              opacity: submitting ? 0.7 : 1,
            }}
            onPress={handleStartReturn}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                Initiate Return
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}


/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  label: {
    fontSize: 12,
    color: "#777",
    fontWeight: "600",
  },
  value: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 2,
  },
  noticeBox: {
    backgroundColor: "#FFF7E6",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#5A4A2F",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  reasonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  reasonChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  reasonChipActive: {
    backgroundColor: "#7FAF9B",
    borderColor: "#7FAF9B",
  },
  reasonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  reasonTextActive: {
    color: "#fff",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    backgroundColor: "#fff",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#7FAF9B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
})
