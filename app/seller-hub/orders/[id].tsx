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

/* ✅ NEW COMPONENTS */
import BuyerShippingAddressCard from "@/components/seller-hub/orders/BuyerShippingAddressCard"
import ConfirmReturnReceivedModal from "@/components/seller-hub/orders/ConfirmReturnReceivedModal"
import SellerMessage from "@/components/seller-hub/orders/SellerMessage"
import SellerOrderActionButtons from "@/components/seller-hub/orders/SellerOrderActionButtons"
import SellerOrderHeaderCard from "@/components/seller-hub/orders/SellerOrderHeaderCard"
import SellerReceiptCard from "@/components/seller-hub/orders/SellerReceiptCard"

/* ---------------- TYPES ---------------- */

type OrderStatus =
  | "paid"
  | "shipped"
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

  // 💰 Ledger fields (source of truth)
  amount_cents: number
  item_price_cents: number | null
  shipping_amount_cents: number | null
  tax_cents: number | null
  seller_fee_cents: number | null
  seller_net_cents: number | null

  image_url: string | null

  carrier: string | null
  tracking_number: string | null
  tracking_url?: string | null

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
}

/* ---------------- HELPERS ---------------- */

const buildTrackingUrl = (carrier: string, tracking: string) => {
  switch (carrier) {
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`
    case "UPS":
      return `https://www.ups.com/track?tracknum=${tracking}`
    case "FedEx":
      return `https://www.fedex.com/fedextrack/?tracknumbers=${tracking}`
    case "DHL":
      return `https://www.dhl.com/en/express/tracking.html?AWB=${tracking}`
    default:
      return null
  }
}

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

  const [confirmReturnVisible, setConfirmReturnVisible] = useState(false)
  // 🆕 ACTIVE DISPUTE (non-return + return disputes)
const [activeDispute, setActiveDispute] = useState<any>(null)

  useEffect(() => {
    if (id) loadOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadOrder = async () => {
    try {
      if (!id) {
        setLoading(false)
        return
      }

      setLoading(true)

      // 🔐 CRITICAL FIX: Get fresh auth user (prevents hydration race)
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

      // 🔒 HYDRATION-SAFE SELLER OWNERSHIP CHECK
      if (data.seller_id !== user.id) {
        console.log("[SELLER ORDER ACCESS BLOCKED]", {
          orderSeller: data.seller_id,
          currentUser: user.id,
          orderId: id,
        })
        Alert.alert("Access denied")
        router.back()
        return
      }

      setOrder(data)
setCarrier(data.carrier ?? "")
setTracking(data.tracking_number ?? "")

// 🧠 MELO CRITICAL: check if ANY dispute exists for this order
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

      const trackingUrl = buildTrackingUrl(carrier, tracking)

      const { error } = await supabase
        .from("orders")
        .update({
          carrier,
          tracking_number: tracking,
          tracking_url: trackingUrl,
          status: "shipped",
          shipped_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)

      if (error) throw error

      try {
        await notify({
          userId: order.buyer_id,
          type: "order",
          title: "Order shipped",
          body: "Your order has been shipped. Tracking information is now available.",
          data: {
            route: "/buyer-hub/orders/[id]",
            params: { id: order.id },
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

    // 🔒 Safety: must have tracking before seller can confirm receipt
    if (!order.return_tracking_number || !order.return_shipped_at) {
      Alert.alert(
        "Tracking Required",
        "You can only complete the return after the buyer ships the item and uploads return tracking."
      )
      return
    }

    // ✅ Open modal (instead of system alert)
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

  /* ---------------- STATE ---------------- */

const isPaid = order.status === "paid"
const isShipped = order.status === "shipped"
const isCompleted = order.status === "completed"
const isReturnStarted = order.status === "return_started"
const isReturnProcessing = order.status === "return_processing"

/* 💸 MELO CRITICAL: REFUND STATE (ESCROW SOURCE OF TRUTH) */
const isRefunded = order.escrow_status === "refunded"

const isInReturnFlow = isReturnStarted || isReturnProcessing
const hasReturnTracking = !!order.return_tracking_url

// show buyer address only for paid / shipped (not return flow, not completed, not refunded)
const showShippingAddress =
  (isPaid || isShipped) &&
  !isInReturnFlow &&
  !isCompleted &&
  !isRefunded

  /* ---------------- MONEY ---------------- */

  const itemPrice = (order.item_price_cents ?? 0) / 100
  const shipping = (order.shipping_amount_cents ?? 0) / 100

  /* ---------------- ACTION FLAGS (SCREEN CONTROLS) ---------------- */

  const showAddTracking = isPaid && !isInReturnFlow && !isCompleted
  const showTrackShipment =
    isShipped && !!order.tracking_url && !isInReturnFlow && !isCompleted

  // seller return section shows during return states
  const showReturnSection = isInReturnFlow && !isCompleted

  // dispute action appears when return shipped and not yet received (same as original)
  const showDispute =
    isReturnStarted && !!order.return_tracking_number && !order.return_received

    /* 🆕 NON-RETURN DISPUTE LOGIC (BUYER ISSUE FLOW) */
const hasActiveDispute = !!activeDispute && !activeDispute?.resolved_at
const buyerOpenedDispute = activeDispute?.opened_by === "buyer"
const sellerAlreadyResponded = !!activeDispute?.seller_responded_at

// 🔥 Show respond button ONLY if buyer opened dispute and seller hasn't responded
const showRespondToDispute =
  hasActiveDispute &&
  buyerOpenedDispute &&
  !sellerAlreadyResponded

// 👁️ Show see dispute if already responded OR seller opened it
const showSeeDispute =
  hasActiveDispute &&
  (sellerAlreadyResponded || activeDispute?.opened_by === "seller")

  /* ---------------- RENDER ---------------- */

return (
  <View style={styles.screen}>
    <AppHeader title="Order" backRoute="/seller-hub/orders" />

    <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
      {/* HEADER CARD */}
      <SellerOrderHeaderCard
        imageUrl={order.image_url}
        orderId={order.public_order_number ?? order.id}
        title={"Order"}
        status={order.status}
        isDisputed={isReturnProcessing}
        hasReturnTracking={hasReturnTracking}
      />

      {/* 💸 REFUND STATUS (HIGHEST PRIORITY - ESCROW RESOLVED) */}
      {isRefunded && (
        <View style={styles.blockPad}>
          <SellerMessage
            variant="success"
            title="Refunded"
            message="The buyer has been refunded successfully. Escrow has been released and this order is financially closed."
          />
        </View>
      )}

      {/* RETURN STATUS MESSAGES (HYBRID C) */}
      {!isRefunded && isReturnProcessing && (
        <View style={styles.blockPad}>
          <SellerMessage
            variant="warning"
            title="Return Disputed"
            message="You filed a dispute on this return. Escrow is frozen until a resolution is completed."
          />
        </View>
      )}

      {!isRefunded && isReturnStarted && !order.return_tracking_number && (
        <View style={styles.blockPad}>
          <SellerMessage
            variant="warning"
            title="Return Started"
            message="The buyer initiated a return but has not uploaded tracking yet. Escrow remains frozen while you wait for the buyer to ship the item."
          />
        </View>
      )}

      {!isRefunded && isReturnStarted && !!order.return_tracking_number && (
        <View style={styles.blockPad}>
          <SellerMessage
            variant="info"
            title="Return In Transit"
            message="The buyer has shipped the return. Track the package and confirm once received to issue the refund, or file a dispute if there is a problem."
          />
        </View>
      )}

      {/* BUYER SHIPPING ADDRESS (SELLER VIEW) */}
      {showShippingAddress && !isRefunded && (
        <BuyerShippingAddressCard
          address={{
            shipping_name: order.shipping_name,
            shipping_line1: order.shipping_line1,
            shipping_line2: order.shipping_line2,
            shipping_city: order.shipping_city,
            shipping_state: order.shipping_state,
            shipping_postal_code: order.shipping_postal_code,
            shipping_country: order.shipping_country,
          }}
        />
      )}

      <View style={styles.content}>
        {/* 🚚 SHIPPING STATE (ONLY WHEN ORDER NEEDS TO BE SHIPPED) */}
        {showAddTracking && !isRefunded && (
          <>
            {/* TRACKING INPUT */}
            <View style={styles.trackingCard}>
              <SellerMessage
                variant="info"
                title="Ship This Order"
                message="Select the carrier and enter tracking to mark this order as shipped."
              />

              {/* Carrier Selection Pills */}
              <View style={styles.field}>
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
              </View>

              {/* Tracking Number Input */}
              <View style={styles.field}>
                <Text style={styles.label}>Tracking Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter tracking number"
                  value={tracking}
                  onChangeText={setTracking}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* 🔥 SINGLE ACTION BAR (SHIP STATE ONLY) */}
            <SellerOrderActionButtons
              showAddTracking={true}
              showTrackShipment={false}
              showReturnSection={false}
              hasReturnTracking={false}
              showDispute={false}
              showRespondToDispute={false}
              showSeeDispute={false}
              trackingUrl={null}
              returnTrackingUrl={null}
              processing={saving}
              onAddTracking={submitTracking}
              onOpenReturnDetails={() => {}}
              onDispute={() => {}}
              onRespondToDispute={() => {}}
              onSeeDispute={() => {}}
            />
          </>
        )}

        {/* RECEIPT (HIDDEN DURING RETURN FLOW & REFUNDS) */}
        {!isInReturnFlow && !isRefunded && (
          <SellerReceiptCard
            itemPrice={itemPrice}
            shipping={shipping}
            status={order.status}
          />
        )}

        {/* 🧠 MASTER ACTION BAR (ALL NON-SHIPPING STATES INCLUDING RETURNS + DISPUTES) */}
        {!isRefunded && !showAddTracking && (
          <SellerOrderActionButtons
            showAddTracking={false}
            showTrackShipment={showTrackShipment && !showReturnSection}
            showReturnSection={showReturnSection}
            hasReturnTracking={hasReturnTracking}
            showDispute={showDispute}
            showRespondToDispute={showRespondToDispute}
            showSeeDispute={showSeeDispute}
            trackingUrl={order.tracking_url ?? null}
            returnTrackingUrl={order.return_tracking_url ?? null}
            processing={saving}
            onAddTracking={submitTracking}

            /* 🔥 CRITICAL FIX: THIS NOW OPENS YOUR CONFIRM RETURN MODAL */
            onOpenReturnDetails={handleCompleteReturn}

            onDispute={() =>
              router.push({
                pathname: "/seller-hub/orders/disputes/dispute-issue",
                params: { id: order.id },
              })
            }

            onRespondToDispute={() =>
              router.push({
                pathname: "/seller-hub/orders/[id]/dispute-issue",
                params: { id: order.id },
              })
            }

            onSeeDispute={() =>
              router.push(`/seller-hub/orders/disputes/${order.id}`)
            }
          />
        )}
      </View>
    </ScrollView>

    {/* MODAL: CONFIRM RETURN RECEIVED (UNCHANGED) */}
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
    marginBottom: 12,
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
})