import { notify } from "@/lib/notifications/notify"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"
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
import BuyerTrackingCard from "@/components/buyer-hub/orders/BuyerTrackingCard"
import ConfirmDeliveryModal from "@/components/buyer-hub/orders/ConfirmDeliveryModal"
import OrderActionButtons from "@/components/buyer-hub/orders/OrderActionButtons"
import ReturnWarning from "@/components/buyer-hub/orders/ReturnWarning"
import ShippersAddress from "@/components/buyer-hub/orders/ShippersAddress"

/* ---------------- TYPES ---------------- */

type OrderStatus =
  | "created"
  | "paid"
  | "shipped"
  | "in_transit"
  | "delivered"
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
  quantity: number | null
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
  delivered_at?: string | null
  listing_snapshot: {
  title?: string | null
  image_urls?: string[] | null
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

  const [hasReviewed, setHasReviewed] = useState(false)

  // ✅ prevents tracking loop
  const hasCheckedTracking = useRef(false)

  useEffect(() => {
    if (id) loadOrder()
  }, [id])

  useFocusEffect(
    useCallback(() => {
      if (id) loadOrder()
    }, [id])
  )

  /* 🔥 EASYPOST TRIGGER (FIXED) */
  useEffect(() => {
    if (
      order?.id &&
      order?.tracking_url &&
      !hasCheckedTracking.current
    ) {
      hasCheckedTracking.current = true

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
      ).catch(() => {})
    }
  }, [order?.id])

  const loadOrder = async () => {
    try {
      if (!id) return

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
          quantity,
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
          delivered_at,
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

      if (!data || data.buyer_id !== user.id) {
        router.replace("/buyer-hub/orders")
        return
      }

      setOrder(data)

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

    // Execute payout + completion flow via Edge Function
    const { error } = await supabase.functions.invoke("execute-stripe-payout", {
      body: {
        order_id: order.id,
        user_id: order.buyer_id,
      },
    })

    if (error) {
      handleAppError(error, {
        fallbackMessage:
          "Unable to release funds right now. Please try again shortly.",
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

  const isDisputed =
    !!order.is_disputed ||
    order.status === "disputed" ||
    order.status === "issue_open"

  const isCompleted = order.status === "completed"
  const isReturnStarted = order.status === "return_started"
  const isReturnProcessing = order.status === "return_processing"

  const isShipped =
    order.status === "shipped" ||
    order.status === "in_transit" ||
    order.status === "delivered"

  const isPaid = order.status === "paid"

  const isInReturnFlow = isReturnStarted || isReturnProcessing

  const hasReturnTracking =
    isInReturnFlow && !!order.return_tracking_url

  const hasShipmentTracking = !!order.tracking_url

  const canTrack =
    !isDisputed &&
    hasShipmentTracking &&
    isShipped &&
    !isInReturnFlow &&
    !isCompleted

  const canConfirmDelivery =
    !isDisputed &&
    isShipped &&
    !isInReturnFlow &&
    !isCompleted

  const canCancel =
    !isDisputed &&
    isPaid &&
    !isShipped &&
    !isInReturnFlow &&
    !isCompleted

  const canDispute =
    !isCompleted &&
    !isInReturnFlow &&
    !order.is_disputed &&
    isShipped

  const showReturnWarning =
    isReturnStarted &&
    !order.return_tracking_url &&
    !order.is_disputed

  const activeTrackingUrl = isInReturnFlow
    ? order.return_tracking_url
    : order.tracking_url

  const quantity = order.quantity ?? 1

  // item price stored as total for quantity
  const itemTotal = (order.item_price_cents ?? 0) / 100

  // calculate unit price for receipt display
  const itemUnitPrice = quantity > 0 ? itemTotal / quantity : itemTotal

  const shipping = (order.shipping_amount_cents ?? 0) / 100
  const tax = (order.tax_cents ?? 0) / 100

  // buyer protection + processing fee
  const buyerFee = (order.buyer_fee_cents ?? 0) / 100

  // ✅ actual total the buyer paid
  const totalPaid = (order.amount_cents ?? 0) / 100

  // ✅ refund excludes buyer protection fee
  const refundAmount = Math.max(0, totalPaid - buyerFee)

  return (
    <View style={styles.screen}>
      <AppHeader title="Order" backRoute="/buyer-hub/orders" />

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <BuyerOrderHeaderCard
  imageUrls={order.listing_snapshot?.image_urls}
  imageUrl={order.image_url}
  orderId={order.public_order_number ?? order.id}
  title={order.listing_snapshot?.title}
  status={order.status}
  isDisputed={order.is_disputed}
  hasReturnTracking={hasReturnTracking}
/>

        <ReturnWarning visible={showReturnWarning} />

        {isInReturnFlow && returnAddress && (
          <ShippersAddress address={returnAddress} />
        )}

        <View style={styles.content}>
          {order.tracking_url && isShipped && !isInReturnFlow && !isCompleted && (
  <View style={{ marginBottom: 12 }}>
    <BuyerTrackingCard
      status={order.status}
      deliveredAt={order.delivered_at}
    />
  </View>
)}

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
            showSeeDispute={isDisputed}
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
            onSeeDispute={() =>
              router.push(`/buyer-hub/orders/disputes/${order.id}`)
            }
          />
        </View>

        {!isInReturnFlow && (
            <BuyerReceiptCard
              itemPrice={itemUnitPrice}
              quantity={quantity}
              shipping={shipping}
              tax={tax}
              buyerFee={buyerFee}
              totalPaid={totalPaid}
              status={order.status}
            />
          )}
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
})