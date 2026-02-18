import { notify } from "@/lib/notifications/notify"
import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"


/* ---------------- TYPES ---------------- */

type OrderStatus =
  | "created"
  | "paid"
  | "shipped"
  | "delivered"
  | "issue_open"
  | "disputed"
  | "return_processing"
  | "completed"


type Order = {
  id: string
  buyer_id: string
  seller_id: string
  status: OrderStatus
  amount_cents: number
  item_price_cents: number | null
  shipping_amount_cents: number | null
  tax_cents: number | null
  buyer_fee_cents: number | null
  image_url: string | null
  tracking_url: string | null
  carrier: string | null
  completed_at: string | null
  is_disputed: boolean | null
  listing_snapshot: {
    title?: string | null
  } | null
}

/* ---------------- SCREEN ---------------- */

export default function BuyerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [cancelReturnVisible, setCancelReturnVisible] = useState(false)


  // ADDED: review state (does not change existing logic)
  const [hasReviewed, setHasReviewed] = useState(false)

   useEffect(() => {
    if (id) loadOrder()
  }, [id])

  const loadOrder = async () => {
    try {
      if (!id) return

      // 🔐 FIX: get fresh user directly (prevents session hydration race)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.replace("/buyer-hub/orders")
        return
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          buyer_id,
          seller_id,
          status,
          amount_cents,
          item_price_cents,
          shipping_amount_cents,
          tax_cents, 
          buyer_fee_cents,
          image_url,
          tracking_url,
          carrier,
          completed_at,
          is_disputed,
          listing_snapshot
        `)
        .eq("id", id)
        .single()

      if (error) {
        handleAppError(error, {
          fallbackMessage: "Failed to load order details.",
        })
        router.replace("/buyer-hub/orders")
        return
      }

      // 🔒 FIX: hydration-safe ownership check (was using session!.user.id)
      if (!data || data.buyer_id !== user.id) {
        console.log("[ORDER ACCESS BLOCKED]", {
          orderBuyer: data?.buyer_id,
          currentUser: user.id,
          orderId: id,
        })
        router.replace("/buyer-hub/orders")
        return
      }

      setOrder(data)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Unexpected error loading order details.",
      })
      router.replace("/buyer-hub/orders")
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- ACTIONS ---------------- */

  const confirmDelivery = async () => {
    if (!order || processing) return

    setProcessing(true)

    const { error } = await supabase.functions.invoke("execute-stripe-payout", {
      body: {
        order_id: order.id,
        user_id: order.buyer_id,
      },
    })

    if (error) {
  handleAppError(error, {
    fallbackMessage:
      "Funds are not available yet. Please try again shortly.",
  })
  setProcessing(false)
  return
}

    setConfirmVisible(false)
    setProcessing(false)

    await notify({
      userId: order.seller_id,
      type: "order",
      title: "Order completed",
      body: "The buyer confirmed delivery. Funds have been released.",
      data: {
        route: "/seller-hub/orders/[id]",
        params: { id: order.id },
      },
    })

    router.replace("/buyer-hub/orders/completed")
  }

  const cancelOrder = async () => {
    if (!order || processing) return

    Alert.alert(
      "Cancel Order?",
      "Are you sure you want to cancel this order? This will refund your payment. Fees are non-refundable.",
      [
        { text: "Go Back", style: "cancel" },
        {
          text: "Yes, Cancel Order",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessing(true)

              const { error } = await supabase.functions.invoke(
                "cancel-order-refund",
                {
                  body: {
                    order_id: order.id,
                  },
                }
              )

              if (error) {
                Alert.alert(
                  "Cancellation Failed",
                  error.message ?? "Unable to cancel this order."
                )
                setProcessing(false)
                return
              }

              Alert.alert(
                "Order Cancelled",
                "Your order has been cancelled and refunded."
              )

              await loadOrder()
              setProcessing(false)
            } catch (err) {
  handleAppError(err, {
    fallbackMessage:
      "Something went wrong cancelling your order.",
  })
  setProcessing(false)
}

          },
        },
      ]
    )
  }

  // NEW: Cancel Return (only for return_processing)
  const cancelReturn = async () => {
    if (!order || processing) return

    Alert.alert(
      "Cancel Return?",
      "Are you sure you want to cancel the return? This will complete the order and can't be undone.",
      [
        { text: "Go Back", style: "cancel" },
        {
          text: "Yes, Cancel Return",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessing(true)

              const { error } = await supabase.functions.invoke(
                "cancel-return-complete-order",
                {
                  body: {
                    order_id: order.id,
                  },
                }
              )

              if (error) {
                handleAppError(error, {
                  fallbackMessage: "Failed to cancel the return.",
                })
                setProcessing(false)
                return
              }

              Alert.alert(
                "Return Cancelled",
                "The return has been cancelled and the order is now completed."
              )

              await loadOrder()
              setProcessing(false)
            } catch (err) {
              handleAppError(err, {
                fallbackMessage:
                  "Something went wrong cancelling the return.",
              })
              setProcessing(false)
            }
          },
        },
      ]
    )
  }

  if (loading || !order) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  const isCompleted = order.status === "completed"
  const isReturnProcessing = order.status === "return_processing"

  const canTrack =
    !!order.tracking_url &&
    ["shipped", "delivered", "completed"].includes(order.status)

  const canConfirmDelivery = order.status === "shipped"

  const canCancel = order.status === "paid"

  const canDispute =
    !order.is_disputed &&
    ["shipped", "delivered"].includes(order.status)

  const itemPrice = (order.item_price_cents ?? 0) / 100
const shipping = (order.shipping_amount_cents ?? 0) / 100
const tax = (order.tax_cents ?? 0) / 100 
const buyerFee = (order.buyer_fee_cents ?? 0) / 100
const totalPaid = (order.amount_cents ?? 0) / 100


  return (
    <View style={styles.screen}>
      <AppHeader
  title="Order"
  backRoute="/buyer-hub/orders"
/>


      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <Image
          source={{ uri: order.image_url ?? undefined }}
          style={styles.image}
        />

        <View style={styles.content}>
          <Text style={styles.orderNumber}>
            Order #{order.id.slice(0, 8)}
          </Text>

          {order.listing_snapshot?.title && (
            <Text style={styles.title}>
              {order.listing_snapshot.title}
            </Text>
          )}

          <View
            style={[
              styles.badge,
              isCompleted && { backgroundColor: "#27AE60" },
            ]}
          >
            <Text style={styles.badgeText}>
              {isCompleted
                ? "COMPLETED"
                : order.status === "paid"
                ? "WAITING FOR SELLER TO SHIP"
                : order.status.replace("_", " ").toUpperCase()}
            </Text>
          </View>

          <View style={styles.receipt}>
  <ReceiptRow label="Item price" value={`$${itemPrice.toFixed(2)}`} />
  <ReceiptRow label="Shipping" value={`$${shipping.toFixed(2)}`} />
  <ReceiptRow
    label="Sales tax (FL)"
    value={`$${tax.toFixed(2)}`}
    subtle
  />
  <ReceiptRow
    label="Buyer protection & processing"
    value={`$${buyerFee.toFixed(2)}`}
    subtle
  />
  <View style={styles.receiptDivider} />
  <ReceiptRow
    label="Total paid"
    value={`$${totalPaid.toFixed(2)}`}
    bold
  />
</View>


          {/* TRACK PACKAGE BUTTON */}
          {canTrack && (
            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() =>
                order.tracking_url &&
                Linking.openURL(order.tracking_url)
              }
            >
              <Ionicons name="car-outline" size={18} color="#fff" />
              <Text style={styles.trackText}>Track Package</Text>
            </TouchableOpacity>
          )}

          {/* CONFIRM DELIVERY */}
          {!isCompleted && canConfirmDelivery && (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={() => setConfirmVisible(true)}
            >
              <Text style={styles.completeText}>
                {processing ? "Processing…" : "Confirm Delivery"}
              </Text>
            </TouchableOpacity>
          )}

          {/* START RETURN (NEW - SIMPLE MVP) */}
{!isCompleted && ["shipped", "delivered"].includes(order.status) && (
  <TouchableOpacity
    style={styles.disputeBtn}
    onPress={() =>
      router.push({
        pathname: "/buyer-hub/returns",
        params: { orderId: order.id },
      })
    }
  >
    <Ionicons
      name="return-down-back-outline"
      size={18}
      color="#fff"
    />
    <Text style={styles.disputeText}>
      Start a Return
    </Text>
  </TouchableOpacity>
)}

          {/* RETURN PROCESSING ACTIONS (BUYER ONLY) */}
          {!isCompleted && isReturnProcessing && (
            <>
              <TouchableOpacity
                style={styles.trackBtn}
                onPress={() =>
                  router.push({
                    pathname: "/buyer-hub/returns/tracking",
                    params: { orderId: order.id },
                  })
                }
              >
                <Ionicons name="barcode-outline" size={18} color="#fff" />
                <Text style={styles.trackText}>Add Return Tracking</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  marginTop: 14,
                  backgroundColor: "#D64545",
                  height: 46,
                  borderRadius: 23,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={cancelReturn}
                disabled={processing}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "900",
                    fontSize: 14,
                  }}
                >
                  {processing ? "Processing…" : "Cancel Return"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* LEAVE REVIEW (ADDED - COMPLETED ONLY, NOT DISPUTED, ONE PER USER) */}
          {isCompleted && !order.is_disputed && !hasReviewed && (
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() =>
                router.push(`/reviews?orderId=${order.id}`)
              }
            >
              <Ionicons name="star" size={18} color="#0F1E17" />
              <Text style={styles.reviewText}>Leave a Review</Text>
            </TouchableOpacity>
          )}

          {/* CANCEL ORDER (BEFORE SHIPMENT ONLY) */}
          {!isCompleted && canCancel && (
            <TouchableOpacity
              style={{
                marginTop: 14,
                backgroundColor: "#D64545",
                height: 46,
                borderRadius: 23,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={cancelOrder}
              disabled={processing}
            >
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "900",
                  fontSize: 14,
                }}
              >
                {processing ? "Cancelling…" : "Cancel Order"}
              </Text>
            </TouchableOpacity>
          )}

          {/* DISPUTE */}
          {canDispute && (
            <TouchableOpacity
              style={styles.disputeBtn}
              onPress={() =>
                router.push(`/buyer-hub/orders/${order.id}/dispute-issue`)
              }
            >
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#fff"
              />
              <Text style={styles.disputeText}>
                Report an Issue
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* CONFIRM MODAL */}
      <Modal transparent visible={confirmVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Confirm Delivery?</Text>
            <Text style={styles.modalText}>
              Once confirmed, the seller will be paid and disputes will no longer
              be available.
            </Text>

            <TouchableOpacity
              style={styles.completeBtn}
              onPress={confirmDelivery}
              disabled={processing}
            >
              <Text style={styles.completeText}>
                {processing ? "Processing…" : "Yes, Confirm Delivery"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setConfirmVisible(false)}>
              <Text style={styles.modalCancel}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

/* ---------------- COMPONENTS ---------------- */

function ReceiptRow({
  label,
  value,
  bold,
  subtle,
}: {
  label: string
  value: string
  bold?: boolean
  subtle?: boolean
}) {
  return (
    <View style={styles.receiptRow}>
      <Text style={[styles.receiptLabel, subtle && { color: "#6B8F7D" }]}>
        {label}
      </Text>
      <Text style={[styles.receiptValue, bold && { fontWeight: "900" }]}>
        {value}
      </Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

  image: {
    width: "100%",
    height: 260,
    resizeMode: "cover",
  },

  content: { padding: 16 },

  orderNumber: {
    fontSize: 13,
    color: "#6B8F7D",
    fontWeight: "700",
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
    color: "#0F1E17",
  },

  badge: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#7FAF9B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#fff",
  },

  receipt: { marginTop: 20 },

  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  receiptLabel: { fontSize: 14, color: "#0F1E17" },

  receiptValue: { fontSize: 14, color: "#0F1E17" },

  receiptDivider: {
    height: 1,
    backgroundColor: "#D6E6DE",
    marginVertical: 6,
  },

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

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },

  modal: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },

  modalText: {
    fontSize: 14,
    marginBottom: 20,
    color: "#333",
  },

  modalCancel: {
    marginTop: 12,
    textAlign: "center",
    color: "#7FAF9B",
    fontWeight: "700",
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
    color: "#0F1E17",
    fontWeight: "900",
    fontSize: 15,
  },
  
})
