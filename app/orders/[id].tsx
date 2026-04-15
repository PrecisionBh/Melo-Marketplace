import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import ConfirmDeliveryModal from "@/components/buyer-hub/orders/ConfirmDeliveryModal"
import ActionConfirmModal from "@/components/orders/ActionConfirmModal"
import BuyerActions from "@/components/orders/BuyerActions"
import BuyerDisputeResponseCard from "@/components/orders/BuyerDisputeResponseCard"
import BuyerRespondDisputeModal from "@/components/orders/BuyerRespondDisputeModal"
import OpenDisputeModal from "@/components/orders/OpenDisputeModal"
import OrderStepIndicator from "@/components/orders/OrderStepIndicator"
import OrderSummaryCard from "@/components/orders/OrderSummaryCard"
import RefundSection from "@/components/orders/RefundSection"
import ReturnActions from "@/components/orders/ReturnActions"
import SellerReturnDisputeCard from "@/components/orders/SellerReturnDisputeCard"
import SellerShippingActions from "@/components/orders/SellerShippingActions"
import TrackPackageButton from "@/components/orders/TrackPackageButton"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

import { useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()

  /* ------------------------------------------------ */
  /* -------------------- STATE ---------------------- */
  /* ------------------------------------------------ */

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)

  const [carrier, setCarrier] = useState("")
  const [tracking, setTracking] = useState("")
  const [saving, setSaving] = useState(false)

  const [showTrackingForm, setShowTrackingForm] =
    useState(false)

  const [confirmVisible, setConfirmVisible] =
    useState(false)
    const [confirmReturnVisible, setConfirmReturnVisible] =
  useState(false)
  const [cancelOrderVisible, setCancelOrderVisible] =
  useState(false)

  const [processing, setProcessing] =
    useState(false)
    const [returnReason, setReturnReason] =
  useState("Item not as described")

const [returnNotes, setReturnNotes] =
  useState("")

const [showReturnForm, setShowReturnForm] =
  useState(false)
  const [disputeVisible, setDisputeVisible] =
  useState(false)
  const [
  buyerDisputeVisible,
  setBuyerDisputeVisible,
] = useState(false)

  /* ------------------------------------------------ */
  /* ---------------- INITIAL LOAD ------------------- */
  /* ------------------------------------------------ */

  useEffect(() => {
    if (id) loadOrder()
  }, [id])

  /* ------------------------------------------------ */
  /* ---------------- LOAD ORDER --------------------- */
  /* ------------------------------------------------ */

  const loadOrder = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error

      setOrder(data)
      setCarrier(data.carrier ?? "")
      setTracking(data.tracking_number ?? "")
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load order.",
      })
    } finally {
      setLoading(false)
    }
  }

  /* ------------------------------------------------ */
  /* ------------ SELLER SHIPPING ACTIONS ----------- */
  /* ------------------------------------------------ */

  const submitTracking = async () => {
    if (!order) return

    if (!carrier || !tracking) {
      alert(
        "Please select a carrier and enter tracking."
      )
      return
    }

    try {
      setSaving(true)

      const { error } =
        await supabase.functions.invoke(
          "create-easypost-tracker",
          {
            body: {
              orderId: order.id,
              carrier,
              trackingNumber: tracking.trim(),
            },
          }
        )

      if (error) throw error

      setShowTrackingForm(false)

      await loadOrder()
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to submit tracking.",
      })
    } finally {
      setSaving(false)
    }
  }

  /* ------------------------------------------------ */
  /* ------------ BUYER COMPLETE ORDER -------------- */
  /* ------------------------------------------------ */

  const confirmDelivery = async () => {
    if (!order || processing) return

    setProcessing(true)

    await supabase
      .from("orders")
      .update({
        delivery_confirmed_by:
          session?.user?.id,
      })
      .eq("id", order.id)

    const { error } =
      await supabase.functions.invoke(
        "execute-stripe-payout",
        {
          body: {
            order_id: order.id,
            user_id: order.buyer_id,
          },
        }
      )

    if (error) {
      handleAppError(error, {
        fallbackMessage:
          "Unable to release funds right now.",
      })

      setProcessing(false)
      return
    }

    setConfirmVisible(false)
    setProcessing(false)

    try {
      await supabase.functions.invoke(
        "send-notification",
        {
          body: {
            userId: order.seller_id,
            type: "order",
            title: "Order completed",
            body:
              "Buyer confirmed delivery. Funds released.",
            data: {
              route:
                "/seller-hub/orders/[id]",
              params: {
                id: order.id,
              },
            },
            dedupeKey: `order-completed-${order.id}`,
          },
        }
      )
    } catch (err) {
      console.log(
        "Notification failed:",
        err
      )
    }

    await loadOrder()
  }

 /* ------------------------------------------------ */
/* --------------- BUYER RETURNS ------------------ */
/* ------------------------------------------------ */

const startReturn = async () => {
  if (!order) return

  try {
    setProcessing(true)

    const { error } = await supabase
      .from("orders")
      .update({
        status: "return_started",
        escrow_status: "held",
        return_reason: returnReason,
        return_notes:
          returnNotes.trim() || null,
        return_requested_at:
          new Date().toISOString(),
        return_deadline: new Date(
          Date.now() +
            72 * 60 * 60 * 1000
        ).toISOString(),
      })
      .eq("id", order.id)
      .eq("buyer_id", session?.user?.id)

    if (error) throw error

    try {
      await supabase.functions.invoke(
        "send-notification",
        {
          body: {
            userId: order.seller_id,
            type: "order",
            title: "Return Initiated",
            body:
              "Buyer has initiated a return.",
            data: {
              route:
                "/seller-hub/orders/[id]",
              params: {
                id: order.id,
              },
            },
            dedupeKey: `return-start-${order.id}`,
          },
        }
      )
    } catch {}

    setShowReturnForm(false)
    setReturnNotes("")

    await loadOrder()
  } catch (err) {
    handleAppError(err, {
      fallbackMessage:
        "Failed to start return.",
    })
  } finally {
    setProcessing(false)
  }
}

const cancelBuyerReturn = async () => {
  if (!order) return

  try {
    setProcessing(true)

    const { error } = await supabase
      .from("orders")
      .update({
        status: "delivered",
        return_reason: null,
        return_notes: null,
        return_requested_at: null,
        return_deadline: null,
      })
      .eq("id", order.id)

    if (error) throw error

    await loadOrder()
  } catch (err) {
    handleAppError(err, {
      fallbackMessage:
        "Failed to cancel return.",
    })
  } finally {
    setProcessing(false)
  }
}

 /* ------------------------------------------------ */
/* ------------ SELLER CANCEL / REFUND ------------ */
/* ------------------------------------------------ */

const cancelSellerOrder = async () => {
  if (!order) return

  try {
    setSaving(true)

    const { error } =
      await supabase.functions.invoke(
        "cancel-order-refund",
        {
          body: {
            order_id: order.id,
          },
        }
      )

    if (error) throw error

    setCancelOrderVisible(false)

    await loadOrder()
  } catch (err) {
    handleAppError(err, {
      fallbackMessage:
        "Failed to cancel order.",
    })
  } finally {
    setSaving(false)
  }
}

/* ------------------------------------------------ */
/* -------- SELLER RETURN RECEIVED / REFUND ------- */
/* ------------------------------------------------ */

const confirmReturnAndRefund = async () => {
  if (!order) return

  try {
    setSaving(true)

    const { error } =
      await supabase.functions.invoke(
        "return-order-refund",
        {
          body: {
            order_id: order.id,
          },
        }
      )

    if (error) throw error

    setConfirmReturnVisible(false)

    await loadOrder()
  } catch (err) {
    handleAppError(err, {
      fallbackMessage:
        "Failed to process refund.",
    })
  } finally {
    setSaving(false)
  }
}


  /* ------------------------------------------------ */
  /* --------------- DISPUTE ACTIONS --------------- */
  /* ------------------------------------------------ */

  const uploadDisputeImages = async (
  images: string[]
) => {
  const urls: string[] = []

  for (let i = 0; i < images.length; i++) {
    const uri = images[i]
    const ext =
      uri.split(".").pop() || "jpg"

    const path = `${order.id}/dispute-${Date.now()}-${i}.${ext}`

    const formData = new FormData()

    formData.append("file", {
      uri,
      name: path,
      type: `image/${ext}`,
    } as any)

    const { error } =
      await supabase.storage
        .from("dispute-images")
        .upload(path, formData)

    if (error) throw error

    const { data } = supabase.storage
      .from("dispute-images")
      .getPublicUrl(path)

    urls.push(data.publicUrl)
  }

  return urls
}

const submitSellerDispute = async ({
  reason,
  description,
  images,
}: {
  reason: string
  description: string
  images: string[]
}) => {
  if (!order) return

  try {
    setSaving(true)

    const evidenceUrls =
      await uploadDisputeImages(images)

    const { error } =
      await supabase
        .from("disputes")
        .insert({
  order_id: order.id,
  buyer_id: order.buyer_id,
  seller_id: order.seller_id,

  opened_by: "seller",

  dispute_type: "return",

  reason,
  description,

  seller_response: description,
  seller_evidence_urls: evidenceUrls,

  status: "open",
})

    if (error) throw error

    await supabase
      .from("orders")
      .update({
        is_disputed: true,
      })
      .eq("id", order.id)

    setDisputeVisible(false)

    await loadOrder()
  } catch (err) {
    handleAppError(err, {
      fallbackMessage:
        "Failed to open dispute.",
    })
  } finally {
    setSaving(false)
  }
}

const submitBuyerDisputeResponse = async ({
  response,
  images,
}: {
  response: string
  images: string[]
}) => {
  if (!order) return

  try {
    setSaving(true)

    const evidenceUrls =
      await uploadDisputeImages(images)

    const { error } = await supabase
      .from("disputes")
      .update({
        buyer_response: response,
        buyer_evidence_urls: evidenceUrls,
        buyer_responded_at:
          new Date().toISOString(),
        status: "under_review",
      })
      .eq("order_id", order.id)

    if (error) throw error

    setBuyerDisputeVisible(false)

    await loadOrder()
  } catch (err) {
    handleAppError(err, {
      fallbackMessage:
        "Failed to submit dispute response.",
    })
  } finally {
    setSaving(false)
  }
}

  /* ------------------------------------------------ */
  /* ---------------- DERIVED STATE ----------------- */
  /* ------------------------------------------------ */

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!order) return null

  const userId = session?.user?.id

  const isBuyer =
    order.buyer_id === userId

  const isSeller =
    order.seller_id === userId

  const isReturnFlow =
    order.status === "return_started" ||
    order.status === "return_processing"

  const isCompleted =
    order.status === "completed"

  const isDelivered =
    order.tracking_status === "delivered"

  const canConfirmDelivery =
    isBuyer &&
    isDelivered &&
    !isReturnFlow &&
    !isCompleted &&
    !order.is_disputed

  /* ------------------------------------------------ */
  /* ------------------- RENDER ---------------------- */
  /* ------------------------------------------------ */

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <OrderSummaryCard order={order} />

        <OrderStepIndicator
          order={order}
          role={isSeller ? "seller" : "buyer"}
        />

        <TrackPackageButton
          trackingUrl={order.tracking_url}
        />

        {isSeller && (
          <>
            <SellerShippingActions
  order={order}
  onAddTracking={() =>
    setShowTrackingForm(true)
  }
  onCancelOrder={() =>
    setCancelOrderVisible(true)
  }
/>

            {showTrackingForm && (
              <View style={styles.trackingCard}>
                <Text style={styles.label}>
                  Select Carrier
                </Text>

                <View style={styles.carrierRow}>
                  {[
                    "USPS",
                    "UPS",
                    "FedEx",
                    "DHL",
                  ].map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.carrierPill,
                        carrier === c &&
                          styles.carrierPillActive,
                      ]}
                      onPress={() =>
                        setCarrier(c)
                      }
                    >
                      <Text
                        style={[
                          styles.carrierText,
                          carrier === c &&
                            styles
                              .carrierTextActive,
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>
                  Tracking Number
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Enter tracking number"
                  value={tracking}
                  onChangeText={setTracking}
                />

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={submitTracking}
                  disabled={saving}
                >
                  <Text style={styles.submitText}>
                    {saving
                      ? "Saving..."
                      : "Mark Shipped"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {isBuyer && (
          <BuyerActions
  order={order}
  refreshOrder={loadOrder}
  onConfirmDelivery={
    canConfirmDelivery
      ? () => setConfirmVisible(true)
      : undefined
  }
  onStartReturn={() =>
    setShowReturnForm(true)
  }
/>
        )}

        {isBuyer && showReturnForm && (
  <View style={styles.trackingCard}>
    <Text style={styles.label}>
      Return Reason
    </Text>

    <TextInput
      style={styles.input}
      value={returnReason}
      onChangeText={setReturnReason}
      placeholder="Reason for return"
    />

    <Text style={styles.label}>
      Additional Notes
    </Text>

    <TextInput
      style={[
        styles.input,
        { height: 100 },
      ]}
      multiline
      value={returnNotes}
      onChangeText={setReturnNotes}
      placeholder="Optional notes"
    />

    <TouchableOpacity
      style={styles.submitBtn}
      onPress={startReturn}
      disabled={processing}
    >
      <Text style={styles.submitText}>
        {processing
          ? "Starting Return..."
          : "Submit Return Request"}
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
  style={styles.cancelReturnBtn}
  onPress={() => {
    setShowReturnForm(false)
    setReturnNotes("")
    setReturnReason("Item not as described")
  }}
>
  <Text style={styles.cancelReturnText}>
    Cancel
  </Text>
</TouchableOpacity>

  </View>
)}

        {isReturnFlow && (
          <ReturnActions
  order={order}
  refreshOrder={loadOrder}
  onCancelReturn={cancelBuyerReturn}
/>
)}

        {isSeller &&
  order.return_received &&
  !order.is_disputed && (
    <RefundSection
      order={order}
      refreshOrder={loadOrder}
      onRefund={() =>
        setConfirmReturnVisible(true)
      }
    />
)}

{isSeller &&
  order.return_received &&
  !order.is_disputed && (
    <SellerReturnDisputeCard
      onOpenDispute={() =>
        setDisputeVisible(true)
      }
    />
)}

{isBuyer &&
  order.is_disputed &&
  order.status === "return_started" && (
    <BuyerDisputeResponseCard
      onRespond={() =>
        setBuyerDisputeVisible(true)
      }
    />
)}
      </ScrollView>

      <ConfirmDeliveryModal
        visible={confirmVisible}
        processing={processing}
        onConfirm={confirmDelivery}
        onClose={() =>
          setConfirmVisible(false)
        }
      />

      <ConfirmDeliveryModal
  visible={confirmReturnVisible}
  processing={saving}
  onConfirm={confirmReturnAndRefund}
  onClose={() =>
    setConfirmReturnVisible(false)
  }
/>

<ActionConfirmModal
  visible={cancelOrderVisible}
  processing={saving}
  title="Cancel Order?"
  message="This will refund the buyer and cancel the order."
  confirmText="Cancel Order"
  destructive
  onConfirm={cancelSellerOrder}
  onClose={() =>
    setCancelOrderVisible(false)
  }
/>

<OpenDisputeModal
  visible={disputeVisible}
  onClose={() =>
    setDisputeVisible(false)
  }
  onSubmit={submitSellerDispute}
/>

<BuyerRespondDisputeModal
  visible={buyerDisputeVisible}
  onClose={() =>
    setBuyerDisputeVisible(false)
  }
  onSubmit={submitBuyerDisputeResponse}
/>

      <GlobalFooter />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },

  trackingCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111",
  },

  carrierRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  carrierPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },

  carrierPillActive: {
    backgroundColor: "#D97732",
  },

  carrierText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },

  carrierTextActive: {
    color: "#fff",
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  submitBtn: {
    backgroundColor: "#D97732",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  submitText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  cancelReturnBtn: {
  marginTop: 10,
  paddingVertical: 14,
  borderRadius: 14,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#D97732",
  backgroundColor: "#fff",
},

cancelReturnText: {
  color: "#D97732",
  fontWeight: "800",
  fontSize: 14,
},

})