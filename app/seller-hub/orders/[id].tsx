import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Linking,
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

/* ✅ NEW COMPONENTS */
import BuyerShippingAddressCard from "@/components/seller-hub/orders/BuyerShippingAddressCard"
import ConfirmReturnReceivedModal from "@/components/seller-hub/orders/ConfirmReturnReceivedModal"
import SellerOrderHeaderCard from "@/components/seller-hub/orders/SellerOrderHeaderCard"
import SellerTrackingCard from "@/components/seller-hub/orders/SellerTrackingCard"

/* ---------------- TYPES ---------------- */

type OrderStatus =
  | "paid"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "return_started"
  | "return_processing"
  | "completed"

type Order = {
  id: string
  public_order_number?: string | null
  escrow_status?: string | null
  seller_id: string
  buyer_id: string
  status: OrderStatus | string
  quantity: number | null
  title: string | null

  amount_cents: number
  item_price_cents: number | null
  shipping_amount_cents: number | null
  tax_cents: number | null
  seller_fee_cents: number | null
  seller_net_cents: number | null

  image_url: string | null
  image_urls: string[] | null

  carrier: string | null
  tracking_number: string | null
  tracking_url?: string | null
  shipping_label_purchased?: boolean | null
  label_url?: string | null
  shipping_label_cost_cents?: number | null
  tracking_status?: string | null

  shipping_name: string | null
  shipping_line1: string | null
  shipping_line2: string | null
  shipping_city: string | null
  shipping_state: string | null
  shipping_postal_code: string | null
  shipping_country: string | null

  return_reason: string | null
  return_notes: string | null
  return_requested_at: string | null
  return_tracking_number: string | null
  return_tracking_url: string | null
  return_shipped_at: string | null
  return_deadline: string | null
  return_received: boolean | null
  return_tracking_status: string | null
}

/* ---------------- HELPERS ---------------- */

/* ---------------- SCREEN ---------------- */

export default function SellerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  const [carrier, setCarrier] = useState("")
  const [tracking, setTracking] = useState("")
  const [saving, setSaving] = useState(false)
  const [isPro, setIsPro] = useState(false)

  const [confirmReturnVisible, setConfirmReturnVisible] = useState(false)
  const [activeDispute, setActiveDispute] = useState<any>(null)

  const [checkedTracking, setCheckedTracking] = useState(false) // ✅ FIX

  useEffect(() => {
    if (id) loadOrder()
  }, [id])

  /* ✅ FIXED TRACKING CHECK (NO LOOP) */
  useEffect(() => {
    if (
      order?.id &&
      order?.tracking_number &&
      !checkedTracking
    ) {
      setCheckedTracking(true)

      fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/check-tracking`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ orderId: order.id }),
        }
      )
        .then(() => {
          setTimeout(() => {
            loadOrder()
          }, 1500)
        })
        .catch(() => {})
    }
  }, [order?.tracking_number]) // ✅ FIXED DEPENDENCY

  const loadOrder = async () => {
    try {
      if (!id) {
        setLoading(false)
        return
      }

      setLoading(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        Alert.alert("Access denied", "You must be signed in.")
        router.back()
        return
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error
      if (!data) {
        Alert.alert("Order not found")
        router.back()
        return
      }

      if (data.seller_id !== user.id) {
        Alert.alert("Access denied")
        router.back()
        return
      }

      setOrder({
        ...data,
        title: data.listing_snapshot?.title ?? null,
      })

      setCarrier(data.carrier ?? "")
      setTracking(data.tracking_number ?? "")

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_pro")
        .eq("id", data.seller_id)
        .single()

      setIsPro(!!profile?.is_pro)

      const { data: disputeData } = await supabase
        .from("disputes")
        .select("id, opened_by, seller_responded_at, resolved_at")
        .eq("order_id", data.id)
        .maybeSingle()

      setActiveDispute(disputeData ?? null)

    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load order details.",
      })
      router.back()
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- ACTIONS ---------------- */

const submitTracking = async () => {
  if (!order) {
    Alert.alert("Error", "Order data is missing. Please reload.")
    return
  }

  if (!carrier || !tracking) {
    Alert.alert("Missing info", "Please select a carrier and enter tracking.")
    return
  }

  try {
    setSaving(true)

    const { error } = await supabase
      .from("orders")
      .update({
        carrier,
        tracking_number: tracking,
        status: "shipped",
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    if (error) throw error

   try {
  await supabase.functions.invoke("send-notification", {
    body: {
      userId: order.buyer_id,
      type: "order",
      title: "Order shipped",
      body: "Your order has been shipped. Tracking information is now available.",
      data: {
        route: "/buyer-hub/orders/[id]",
        params: { id: order.id },
      },
      dedupeKey: `order-shipped-${order.id}`, // 🔥 unique event
    },
  })
} catch (notifyErr) {
  handleAppError(notifyErr, {
    fallbackMessage: "Order shipped, but notification failed.",
  })
}

    Alert.alert(
      "Order Shipped",
      "Tracking has been added and the order is now in progress.",
      [
        {
          text: "OK",
          onPress: () => router.replace("/seller-hub/orders/orders-to-ship"),
        },
      ]
    )
  } catch (err) {
    handleAppError(err, {
      fallbackMessage: "Failed to update tracking. Please try again.",
    })
  } finally {
    setSaving(false)
  }
}

const handleCompleteReturn = async () => {
  if (!order || !session?.user?.id) {
    Alert.alert("Error", "Order data is missing.")
    return
  }

  if (!order.return_tracking_number || !order.return_shipped_at) {
    Alert.alert(
      "Tracking Required",
      "You can only complete the return after the buyer ships the item and uploads return tracking."
    )
    return
  }

  setConfirmReturnVisible(true)
}

const confirmReturnAndRefund = async () => {
  if (!order) return

  try {
    setSaving(true)

    const { error } = await supabase.functions.invoke("return-order-refund", {
      body: { order_id: order.id },
    })

    if (error) throw error

    await loadOrder()

    Alert.alert(
      "Return Completed & Refunded",
      "The return has been confirmed and the buyer has been refunded successfully."
    )

    router.replace("/seller-hub/orders/orders-to-ship")
  } catch (err) {
    handleAppError(err, {
      fallbackMessage: "Failed to process return refund. Please try again.",
    })
  } finally {
    setSaving(false)
    setConfirmReturnVisible(false)
  }
}

if (loading) return <ActivityIndicator style={{ marginTop: 80 }} />
if (!order) return null

/* ---------------- STATE ---------------- */

const isPaid = order.status === "paid"
const isShipped =
  order.status === "shipped" ||
  order.status === "in_transit" ||
  order.status === "delivered"
const isCompleted = order.status === "completed"
const isReturnStarted = order.status === "return_started"
const isReturnProcessing = order.status === "return_processing"

const isRefunded = order.escrow_status === "refunded"

const isInReturnFlow = isReturnStarted || isReturnProcessing
const hasReturnTracking = !!order.return_tracking_url

const hasActiveDispute = !!activeDispute && !activeDispute?.resolved_at
const buyerOpenedDispute = activeDispute?.opened_by === "buyer"
const sellerAlreadyResponded = !!activeDispute?.seller_responded_at

const isCancelled =
  order.status === "cancelled_by_seller" ||
  order.status === "cancelled"

const canSellerCancel =
  (isPaid || order.status === "processing") &&
  !isShipped &&
  !isCompleted &&
  !isRefunded &&
  !isReturnStarted &&
  !isReturnProcessing &&
  !hasActiveDispute

const showShippingAddress =
  (isPaid || isShipped) &&
  !isInReturnFlow &&
  !isCompleted &&
  !isRefunded

  const isReturnTrackingActive =
  isInReturnFlow && !!order.return_tracking_number

/* ---------------- MONEY ---------------- */

const quantity = order.quantity ?? 1
const itemTotal = (order.item_price_cents ?? 0) / 100
const itemUnitPrice = quantity > 0 ? itemTotal / quantity : itemTotal
const shipping = (order.shipping_amount_cents ?? 0) / 100
const tax = (order.tax_cents ?? 0) / 100

const sellerFee = (order.seller_fee_cents ?? 0) / 100
const sellerNet = (order.seller_net_cents ?? 0) / 100
const totalPaid = (order.amount_cents ?? 0) / 100

/* ---------------- ACTION FLAGS ---------------- */

// 🚨 detect any tracking (manual only now)
const hasTracking =
  !!order.tracking_url || !!order.tracking_number

// 🧠 unified tracking URL (same idea as buyer screen)
const activeTrackingUrl = isInReturnFlow
  ? order.return_tracking_url ?? null
  : order.tracking_url ?? null

// 🟢 ONLY show add tracking if NOTHING exists yet
const showAddTracking =
  isPaid &&
  !hasTracking &&
  !isInReturnFlow &&
  !isCompleted

// 📍 show tracking if shipped AND we have tracking OR number
const showTrackShipment =
  isShipped &&
  hasTracking &&
  !isInReturnFlow &&
  !isCompleted

const showReturnSection = isInReturnFlow && !isCompleted

const showDispute =
  isReturnStarted && !!order.return_tracking_number && !order.return_received

const showRespondToDispute =
  hasActiveDispute &&
  buyerOpenedDispute &&
  !sellerAlreadyResponded

const showSeeDispute =
  hasActiveDispute &&
  (sellerAlreadyResponded || activeDispute?.opened_by === "seller")

const handleCancelOrder = async () => {
  if (!order) return

  Alert.alert(
    "Cancel Order",
    "Are you sure you want to cancel this order? The buyer will be refunded and escrow will be closed.",
    [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel & Refund",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true)

            const { error } = await supabase.functions.invoke(
              "cancel-order-refund",
              { body: { order_id: order.id } }
            )

            if (error) throw error

            await loadOrder()

            Alert.alert("Order Cancelled")

            router.replace("/seller-hub/orders/orders-to-ship")
          } catch (err) {
            handleAppError(err, {
              fallbackMessage: "Failed to cancel order.",
            })
          } finally {
            setSaving(false)
          }
        },
      },
    ]
  )
}

/* ---------------- RENDER ---------------- */

return (
  <View style={styles.screen}>
    <AppHeader title="Order" backRoute="/seller-hub/orders" />

    <ScrollView
      contentContainerStyle={{ paddingBottom: 140 }}
      nestedScrollEnabled
    >
      <SellerOrderHeaderCard
        imageUrls={order.image_urls}
        imageUrl={order.image_url}
        orderId={order.public_order_number ?? order.id}
        title={order.title}
        status={order.status}
        isDisputed={isReturnProcessing}
        hasReturnTracking={hasReturnTracking}
      />

      {showShippingAddress && !isRefunded && !isCancelled && (
        <BuyerShippingAddressCard address={order} />
      )}

      <View style={styles.content}>
        {/* 🟢 ADD TRACKING FLOW */}
        {showAddTracking && !isRefunded && !isCancelled && (
          <View style={styles.trackingCard}>
            <Text style={styles.label}>Select Carrier</Text>
            <View style={styles.carrierRow}>
              {["USPS", "UPS", "FedEx", "DHL"].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.carrierPill,
                    carrier === c && styles.carrierPillActive,
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

            <View style={styles.field}>
              <Text style={styles.label}>Tracking Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter tracking number"
                value={tracking}
                onChangeText={setTracking}
              />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: "#000",
                padding: 14,
                borderRadius: 12,
                alignItems: "center",
                marginTop: 16,
                opacity: saving ? 0.6 : 1,
              }}
              disabled={saving}
              onPress={submitTracking}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                {saving ? "Saving..." : "Mark as Shipped"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 📦 TRACKING STATUS CARD (FORWARD) */}
        {showTrackShipment &&
          !isRefunded &&
          !isCancelled &&
          !isInReturnFlow && (
            <SellerTrackingCard tracking_status={order.tracking_status} />
          )}

        {/* 🔁 RETURN TRACKING CARD */}
        {isReturnTrackingActive &&
          !isRefunded &&
          !isCancelled && (
            <SellerTrackingCard
              tracking_status={order.return_tracking_status}
              isReturn
            />
          )}

        {/* 📍 TRACK PACKAGE */}
        {(showTrackShipment || isReturnTrackingActive) &&
          !isRefunded &&
          !isCancelled && (
            <TouchableOpacity
              style={{
                backgroundColor: "#000",
                padding: 14,
                borderRadius: 12,
                alignItems: "center",
                marginTop: 12,
                marginBottom: 12,
              }}
              onPress={async () => {
                if (!activeTrackingUrl) {
                  Alert.alert("Tracking not available yet")
                  return
                }

                try {
                  await Linking.openURL(activeTrackingUrl)
                } catch (err) {
                  Alert.alert("Unable to open tracking link")
                }
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                📍 Track Package
              </Text>
            </TouchableOpacity>
          )}

        {/* RECEIPT + ACTIONS unchanged */}
      </View>
    </ScrollView>

    <ConfirmReturnReceivedModal
      visible={confirmReturnVisible}
      processing={saving}
      onConfirm={confirmReturnAndRefund}
      onClose={() => setConfirmReturnVisible(false)}
    />
  </View>
)

}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },
  content: {
    padding: 16,
  },
  blockPad: {
    paddingHorizontal: 16,
    marginTop: 8,
  },

  /* 📦 Tracking UI */
  trackingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 22,
  },
  field: {
    marginTop: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    color: "#1E1E1E",
  },
  input: {
    backgroundColor: "#F5F7F6",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  carrierRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  carrierPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#F1F3F2",
  },
  carrierPillActive: {
    backgroundColor: "#7FAF9B",
  },
  carrierText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  carrierTextActive: {
    color: "#FFFFFF",
  },

  quantityCard: {
    backgroundColor: "#FFF4E5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F2C97D",
  },

  quantityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7A4B00",
    marginBottom: 4,
  },

  quantityText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#7A4B00",
  },
})