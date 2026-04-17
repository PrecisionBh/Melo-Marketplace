import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import AddTrackingModal from "@/components/orders/AddTrackingModal"
import OrderStepIndicator from "@/components/orders/OrderStepIndicator"
import OrderSummaryCard from "@/components/orders/OrderSummaryCard"
import ReturnActions from "@/components/orders/ReturnActions"
import ReturnStepIndicator from "@/components/orders/ReturnStepIndicator"
import SellerShippingActions from "@/components/orders/SellerShippingActions"
import ShippingRatesModal from "@/components/orders/ShippingRatesModal"
import TrackPackageButton from "@/components/orders/TrackPackageButton"
import VoidLabelModal from "@/components/orders/VoidLabelModal"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native"


export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()
  const router = useRouter()

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
    const [rates, setRates] = useState<any[]>([])
const [shipmentId, setShipmentId] = useState<string | null>(null)
const [showRateModal, setShowRateModal] = useState(false)
const [buyingLabel, setBuyingLabel] = useState(false)
const [loadingRates, setLoadingRates] = useState(false)
const [showVoidModal, setShowVoidModal] = useState(false)
const [voidingLabel, setVoidingLabel] = useState(false)

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

  if (!carrier || !tracking.trim()) {
  alert("Please enter tracking info")
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
/* ------------ BUY SHIPPING LABEL ---------------- */
/* ------------------------------------------------ */

const buyShippingLabel = async () => {
  if (!order) return

  try {
    setSaving(true)

    const { error } =
      await supabase.functions.invoke(
        "create-shipping-label",
        {
          body: {
            order_id: order.id,
          },
        }
      )

    if (error) throw error

    await loadOrder()
  } catch (err) {
    handleAppError(err, {
      fallbackMessage:
        "Failed to purchase shipping label.",
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

    const needsPayment =
  isBuyer && order.status === "pending_payment"

  const isSeller =
    order.seller_id === userId

  const isReturnFlow =
  order.status === "return_started" ||
  order.status === "return_label_purchased" ||
  order.status === "return_shipped" ||
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

    <ScrollView contentContainerStyle={styles.content}>
      <OrderSummaryCard order={order} />

      {needsPayment && (
        <View style={styles.payNowCard}>
          <Text style={styles.payNowTitle}>
            Awaiting Payment
          </Text>

          <Text style={styles.payNowSub}>
            Your order has been placed but payment is required to proceed.
          </Text>

          <TouchableOpacity
            style={styles.payNowBtn}
            onPress={() =>
              router.push({
                pathname: "/cart/[offerId]",
                params: {
                  offerId: order.offer_id,
                  orderId: order.id,
                },
              })
            }
          >
            <Text style={styles.payNowText}>
              Pay Now
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!needsPayment && (
  isReturnFlow ? (
    <ReturnStepIndicator
      order={order}
      role={isSeller ? "seller" : "buyer"}
    />
  ) : (
    <OrderStepIndicator
      order={order}
      role={isSeller ? "seller" : "buyer"}
    />
  )
)}

      <TrackPackageButton trackingUrl={order.tracking_url} />

      {isSeller && (
        <>
          <SellerShippingActions
  order={order}
  onAddTracking={() => setShowTrackingForm(true)}
  onCancelOrder={() => setCancelOrderVisible(true)}
  loadingRates={loadingRates}
  onBuyLabel={async () => {
    try {
      setLoadingRates(true)

      const { data, error } =
        await supabase.functions.invoke(
          "get-shipping-rates",
          {
            body: { order_id: order.id },
          }
        )

      if (error) throw error

      setRates(data.rates)
      setShipmentId(data.shipment_id)

      setShowRateModal(true)
    } catch (err) {
      console.log(err)
      alert("Failed to load shipping rates")
    } finally {
      setLoadingRates(false)
    }
  }}
  onVoidLabel={() => setShowVoidModal(true)} // 🔥 ADD THIS LINE
/>

{isReturnFlow && isBuyer && (
  <ReturnActions
    order={order}
    refreshOrder={loadOrder}
    onCancelReturn={cancelBuyerReturn}
    onBuyReturnLabel={async () => {
      try {
        setLoadingRates(true)

        const { data, error } =
          await supabase.functions.invoke(
            "get-return-rates",
            {
              body: { order_id: order.id },
            }
          )

        if (error) throw error

        setRates(data.rates)
        setShipmentId(data.shipment_id)

        setShowRateModal(true)
      } catch (err) {
        console.log(err)
        alert("Failed to load return rates")
      } finally {
        setLoadingRates(false)
      }
    }}
  />
)}

        </>
      )}
    </ScrollView>

    <AddTrackingModal
  visible={showTrackingForm}
  carrier={carrier}
  setCarrier={setCarrier}
  tracking={tracking}
  setTracking={setTracking}
  loading={saving}
  onClose={() => setShowTrackingForm(false)}
  onSubmit={submitTracking}
/>

    <ShippingRatesModal
  visible={showRateModal}
  rates={rates}
  loading={buyingLabel}
  onClose={() => setShowRateModal(false)}
  onPurchase={async (rate) => {
    try {
      setBuyingLabel(true)

      const { error } =
        await supabase.functions.invoke(
          "create-shipping-label",
          {
            body: {
              order_id: order.id,
              rate_id: rate.rate_id,
              shipment_id: shipmentId,
            },
          }
        )

      if (error) throw error

      setShowRateModal(false)

      await loadOrder()
    } catch (err) {
      console.log(err)
      alert("Failed to purchase label")
    } finally {
      setBuyingLabel(false)
    }
  }}
/>

<VoidLabelModal
  visible={showVoidModal}
  loading={voidingLabel}
  onClose={() => setShowVoidModal(false)}
  onConfirm={async () => {
  try {
    if (order.tracking_status === "in_transit") {
      alert("Label already in transit and cannot be voided")
      return
    }

    setVoidingLabel(true)

    const { error } =
      await supabase.functions.invoke(
        "void-shipping-label",
        {
          body: { order_id: order.id },
        }
      )

    if (error) throw error

    setShowVoidModal(false)

    await loadOrder()
  } catch (err) {
    console.log(err)
    alert("Failed to void label")
  } finally {
    setVoidingLabel(false)
  }
}}
/>

{cancelOrderVisible && (
  <View style={{
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  }}>
    <View style={{
      width: "100%",
      backgroundColor: "#fff",
      borderRadius: 24,
      padding: 20,
    }}>
      <Text style={{
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 8,
      }}>
        Cancel Order
      </Text>

      <Text style={{
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 10,
      }}>
        This will cancel the order and refund the buyer.
      </Text>

      <Text style={{
        fontSize: 12,
        color: "#DC2626",
        marginBottom: 16,
      }}>
        This action cannot be undone.
      </Text>

      {/* CONFIRM */}
      <TouchableOpacity
        style={{
          backgroundColor: "#DC2626",
          paddingVertical: 14,
          borderRadius: 16,
          alignItems: "center",
        }}
        onPress={cancelSellerOrder}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "800" }}>
            Yes, Cancel Order
          </Text>
        )}
      </TouchableOpacity>

      {/* CANCEL */}
      <TouchableOpacity
        style={{ marginTop: 10, alignItems: "center" }}
        onPress={() => setCancelOrderVisible(false)}
      >
        <Text style={{ color: "#6B7280" }}>
          Go Back
        </Text>
      </TouchableOpacity>
    </View>
  </View>
)}

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

payNowCard: {
  backgroundColor: "#FFF7ED",
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#FED7AA",
  padding: 16,
  marginBottom: 16,
},

payNowTitle: {
  fontSize: 16,
  fontWeight: "800",
  color: "#C2410C",
  marginBottom: 6,
},

payNowSub: {
  fontSize: 13,
  color: "#9A3412",
  marginBottom: 12,
},

payNowBtn: {
  backgroundColor: "#D97732",
  paddingVertical: 14,
  borderRadius: 14,
  alignItems: "center",
},

payNowText: {
  color: "#fff",
  fontWeight: "800",
  fontSize: 14,
},

})