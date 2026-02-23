import { notify } from "@/lib/notifications/notify"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

import BuyerOrderHeaderCard from "@/components/buyer-hub/orders/BuyerOrderHeaderCard"
import BuyerReceiptCard from "@/components/buyer-hub/orders/BuyerReceiptCard"
import ConfirmDeliveryModal from "@/components/buyer-hub/orders/ConfirmDeliveryModal"
import OrderActionButtons from "@/components/buyer-hub/orders/OrderActionButtons"
import ReturnWarning from "@/components/buyer-hub/orders/ReturnWarning"
import ShippersAddress from "@/components/buyer-hub/orders/ShippersAddress"; // 🔥 ADDED


/* ---------------- TYPES ---------------- */

/* ---------------- TYPES ---------------- */

type OrderStatus =
  | "created"
  | "paid"
  | "shipped"
  | "return_started"
  | "return_processing"
  | "issue_open"
  | "disputed"
  | "completed"

type Order = {
  id: string
  public_order_number?: string | null 
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
  return_tracking_url: string | null
  carrier: string | null
  completed_at: string | null
  is_disputed: boolean | null
  listing_snapshot: {
    title?: string | null
  } | null
}

type SellerReturnAddress = {
  id: string
  user_id: string
  full_name: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  postal_code: string
  country: string
  is_default?: boolean | null
}

/* ---------------- SCREEN ---------------- */

export default function BuyerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [returnAddress, setReturnAddress] = useState<SellerReturnAddress | null>(null)
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
          public_order_number, 
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
          return_tracking_url,
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

      // 🔥 NEW: fetch seller return shipping address (MANDATORY FOR RETURN FLOW)
      const { data: addressData } = await supabase
  .from("seller_return_addresses")
  .select("*")
  .eq("user_id", data.seller_id)
  .maybeSingle()

      setReturnAddress(addressData ?? null)

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
const isReturnStarted = order.status === "return_started"
const isReturnProcessing = order.status === "return_processing"
const isShipped = order.status === "shipped"
const isPaid = order.status === "paid"

// 🔥 TRUE RETURN FLOW (handles BOTH statuses)
const isInReturnFlow = isReturnStarted || isReturnProcessing

// 🚨 CRITICAL FIX: use RETURN tracking, NOT seller shipment tracking
const hasReturnTracking =
  isInReturnFlow && !!order.return_tracking_url

// Seller shipment tracking (separate system)
const hasShipmentTracking = !!order.tracking_url

// 🚚 Track Package logic (ONLY for seller shipment, never during return flow)
const canTrack =
  hasShipmentTracking && isShipped && !isInReturnFlow && !isCompleted

// Confirm delivery ONLY if shipped and NOT in return flow
const canConfirmDelivery = isShipped && !isInReturnFlow && !isCompleted

// Cancel only before seller ships and not in return flow
const canCancel = isPaid && !isShipped && !isInReturnFlow && !isCompleted

// Buyer disputes allowed ONLY before return starts
// (Once return_started, seller handles return OR disputes it)
const canDispute =
  !isCompleted &&
  !isInReturnFlow &&
  !order.is_disputed &&
  isShipped

// 🚨 72-HOUR ANTI-SCAM WARNING
// MUST show immediately when status = return_started AND no return tracking uploaded
const showReturnWarning =
  isReturnStarted &&
  !order.return_tracking_url &&
  !order.is_disputed

// 🔁 IMPORTANT: correct tracking URL passed to component
// - During return flow → use return tracking
// - Otherwise → use seller shipment tracking
const activeTrackingUrl = isInReturnFlow
  ? order.return_tracking_url
  : order.tracking_url

const itemPrice = (order.item_price_cents ?? 0) / 100
const shipping = (order.shipping_amount_cents ?? 0) / 100
const tax = (order.tax_cents ?? 0) / 100
const buyerFee = (order.buyer_fee_cents ?? 0) / 100
const totalPaid = (order.amount_cents ?? 0) / 100

return (
  <View style={styles.screen}>
    <AppHeader title="Order" backRoute="/buyer-hub/orders" />

    <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
      <BuyerOrderHeaderCard
        imageUrl={order.image_url}
        orderId={order.public_order_number ?? order.id}
        title={order.listing_snapshot?.title}
        status={order.status}
        isDisputed={order.is_disputed}
        hasReturnTracking={hasReturnTracking}
      />

       {/* 🚨 WARNING: Shows immediately when return_started */}
    <ReturnWarning visible={showReturnWarning} />

      {/* 🔥 NEW: Show shipper address ONLY during return flow */}
      {isInReturnFlow && returnAddress && (
  <ShippersAddress address={returnAddress} />
)}

      <View style={styles.content}>
        {/* 🔥 REMOVE RECEIPT during return_started & return_processing */}
        {!isInReturnFlow && (
          <BuyerReceiptCard
            itemPrice={itemPrice}
            shipping={shipping}
            tax={tax}
            buyerFee={buyerFee}
            totalPaid={totalPaid}
            status={order.status} // 🔥 REQUIRED for refunded badge
          />
        )}

        {/* 🔥 LOGIC STAYS IN SCREEN (COMPONENT = UI ONLY) */}
        <OrderActionButtons
          showTrack={canTrack}
          showConfirmDelivery={!isCompleted && canConfirmDelivery}
          showStartReturn={
            !isCompleted &&
            isShipped &&
            !isInReturnFlow &&
            !order.is_disputed
          }
          showReturnSection={
            !isCompleted &&
            isInReturnFlow &&
            !order.is_disputed
          }
          hasReturnTracking={hasReturnTracking}
          showLeaveReview={
            isCompleted && !order.is_disputed && !hasReviewed
          }
          showCancelOrder={!isCompleted && canCancel}
          showDispute={canDispute}
          trackingUrl={activeTrackingUrl}
          processing={processing}
          onConfirmDelivery={() => setConfirmVisible(true)}
          onStartReturn={() =>
            router.push({
              pathname: "/buyer-hub/returns",
              params: { orderId: order.id },
            })
          }
          onAddReturnTracking={() =>
            router.push({
              pathname: "/buyer-hub/returns/tracking",
              params: { orderId: order.id },
            })
          }
          onCancelReturn={cancelReturn}
          onCancelOrder={cancelOrder}
          onDispute={() =>
            router.push(`/buyer-hub/orders/${order.id}/dispute-issue`)
          }
          onLeaveReview={() =>
            router.push(`/reviews?orderId=${order.id}`)
          }
        />
      </View>
    </ScrollView>

    <ConfirmDeliveryModal
      visible={confirmVisible}
      processing={processing}
      onConfirm={confirmDelivery}
      onClose={() => setConfirmVisible(false)}
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

  /* --- MODAL (still used in this screen) --- */
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
})

