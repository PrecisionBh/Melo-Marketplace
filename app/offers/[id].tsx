import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import OfferActionButtons from "@/components/offers/OfferActionButtons"
import OfferActionResultModal from "@/components/offers/OfferActionResultModal"
import OfferExpiryTimer from "@/components/offers/OfferExpiryTimer"
import OfferReceiptCard from "@/components/offers/OfferReceiptCard"
import OfferSummaryCard from "@/components/offers/OfferSummaryCard"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

export default function OfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [offer, setOffer] = useState<any>(null)

  const [showCounter, setShowCounter] =
    useState(false)
  const [counterAmount, setCounterAmount] =
    useState("")

  const [resultModal, setResultModal] =
    useState<{
      visible: boolean
      title: string
      message: string
      primaryText?: string
      secondaryText?: string
      onPrimary?: () => void
      onSecondary?: () => void
    }>({
      visible: false,
      title: "",
      message: "",
    })

  useEffect(() => {
    if (id && session?.user?.id) {
      loadOffer()
    }
  }, [id, session?.user?.id])

  const loadOffer = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("offers")
        .select(
          `
          *,
          listings (
            *
          )
        `
        )
        .eq("id", id)
        .single()

      if (error) throw error

      setOffer(data)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to load offer.",
      })
    } finally {
      setLoading(false)
    }
  }

  const userId = session?.user?.id
  const isBuyer = offer?.buyer_id === userId
  const isSeller = offer?.seller_id === userId

  const isExpired = useMemo(() => {
    if (!offer?.expires_at) return false

    return (
      Date.now() >
      new Date(offer.expires_at).getTime()
    )
  }, [offer])

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!offer) return null

  const quantity = offer.quantity ?? 1
  const unitPrice = offer.current_amount
  const itemTotal = unitPrice * quantity

  const shippingCost =
    offer.listings?.shipping_type ===
    "buyer_pays"
      ? offer.listings?.shipping_price ?? 0
      : 0

  const buyerFee = Number(
    (itemTotal * 0.044 + 0.3).toFixed(2)
  )

  const buyerTotal = Number(
    (
      itemTotal +
      shippingCost +
      buyerFee
    ).toFixed(2)
  )

  const sellerFee = Number(
    (
      (itemTotal + shippingCost) *
      0.05
    ).toFixed(2)
  )

  const sellerPayout = Number(
    (
      itemTotal +
      shippingCost -
      sellerFee
    ).toFixed(2)
  )

  const receiptRows = isBuyer
    ? [
        {
          label: "Unit Price",
          value: `$${unitPrice.toFixed(2)}`,
        },
        {
          label: "Quantity",
          value: `x${quantity}`,
        },
        {
          label: "Offer Total",
          value: `$${itemTotal.toFixed(2)}`,
        },
        {
          label: "Shipping",
          value:
            shippingCost > 0
              ? `$${shippingCost.toFixed(2)}`
              : "Free",
        },
        {
          label:
            "Buyer Protection & Processing",
          value: `$${buyerFee.toFixed(2)}`,
        },
        {
          label: "Total Due",
          value: `$${buyerTotal.toFixed(2)}`,
          bold: true,
        },
      ]
    : [
        {
          label: "Unit Price",
          value: `$${unitPrice.toFixed(2)}`,
        },
        {
          label: "Quantity",
          value: `x${quantity}`,
        },
        {
          label: "Offer Total",
          value: `$${itemTotal.toFixed(2)}`,
        },
        {
          label: "Shipping",
          value:
            shippingCost > 0
              ? `$${shippingCost.toFixed(2)}`
              : "Free",
        },
        {
          label: "Seller Fee",
          value: `-$${sellerFee.toFixed(2)}`,
        },
        {
          label: "You Receive",
          value: `$${sellerPayout.toFixed(2)}`,
          bold: true,
        },
      ]

  const canBuyerPay =
    isBuyer &&
    offer.status === "accepted" &&
    !isExpired

  const awaitingSeller =
  !isExpired &&
  offer.status === "pending" &&
  isBuyer &&
  offer.last_actor === "buyer"

const awaitingBuyer =
  !isExpired &&
  offer.status === "countered" &&
  isSeller &&
  offer.last_actor === "seller"

const canSellerRespond =
  !isExpired &&
  !offer.listings?.is_sold &&
  (
    offer.status === "pending" ||
    offer.status === "countered"
  ) &&
  offer.counter_count < 6 &&
  isSeller &&
  offer.last_actor === "buyer"

const canBuyerRespond =
  !isExpired &&
  !offer.listings?.is_sold &&
  offer.status === "countered" &&
  offer.counter_count < 6 &&
  isBuyer &&
  offer.last_actor === "seller"

const canRespond =
  canSellerRespond || canBuyerRespond

  const submitCounter = async () => {
    const amount = Number(counterAmount)

    if (!amount || amount <= 0) return

    try {
      setSaving(true)

      const newExpiresAt = new Date(
        Date.now() +
          24 * 60 * 60 * 1000
      ).toISOString()

      const { error } = await supabase
        .from("offers")
        .update({
          current_amount: amount,
          counter_count:
            offer.counter_count + 1,
          last_actor: isBuyer
            ? "buyer"
            : "seller",
          status: "countered",
          expires_at: newExpiresAt,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", offer.id)

      if (error) throw error

      setShowCounter(false)
      setCounterAmount("")

      setResultModal({
        visible: true,
        title: "Counter Sent",
        message: isBuyer
          ? "Seller has been notified of your counter offer."
          : "Buyer has been notified of your counter offer.",
        onPrimary: () =>
          setResultModal((p) => ({
            ...p,
            visible: false,
          })),
      })

      await loadOffer()
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to send counter.",
      })
    } finally {
      setSaving(false)
    }
  }

  const acceptOffer = async () => {
    try {
      setSaving(true)

      if (isSeller) {
        const { data: listingCheck } =
          await supabase
            .from("listings")
            .select("is_sold")
            .eq("id", offer.listing_id)
            .single()

        if (listingCheck?.is_sold) {
          throw new Error(
            "Item already sold."
          )
        }

        const { error } = await supabase
          .from("offers")
          .update({
            status: "accepted",
            last_actor: "seller",
            accepted_price:
              offer.current_amount,
            accepted_title:
              offer.listings.title,
            accepted_image_url:
              offer.listings
                .image_urls?.[0] ?? null,
            accepted_shipping_type:
              offer.listings
                .shipping_type,
            accepted_shipping_price:
              offer.listings
                .shipping_type ===
              "buyer_pays"
                ? offer.listings
                    .shipping_price ?? 0
                : 0,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", offer.id)

        if (error) throw error

        await supabase
          .from("listings")
          .update({
            is_sold: true,
          })
          .eq("id", offer.listing_id)

        setResultModal({
          visible: true,
          title: "Offer Accepted",
          message:
            "Buyer has been notified and prompted to complete payment.",
          onPrimary: () => {
            setResultModal((p) => ({
              ...p,
              visible: false,
            }))
            router.push("/profile")
          },
        })
      } else {
        router.push({
          pathname: "/cart/[offerId]",
          params: { offerId: offer.id },
        })
      }

      await loadOffer()
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to accept offer.",
      })
    } finally {
      setSaving(false)
    }
  }

  const cancelOffer = async () => {
  try {
    setSaving(true)

    await supabase
      .from("offers")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", offer.id)

    setResultModal({
      visible: true,
      title: "Offer Cancelled",
      message:
        "Your offer has been cancelled.",
      onPrimary: () => {
        setResultModal((p) => ({
          ...p,
          visible: false,
        }))
        router.push("/profile")
      },
    })

    await loadOffer()
  } finally {
    setSaving(false)
  }
}

  const declineOffer = async () => {
    try {
      setSaving(true)

      await supabase
        .from("offers")
        .update({
          status: "declined",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", offer.id)

      setResultModal({
        visible: true,
        title: "Offer Declined",
        message:
          "The other party has been notified.",
        onPrimary: () => {
          setResultModal((p) => ({
            ...p,
            visible: false,
          }))
          router.push("/profile")
        },
      })

      await loadOffer()
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <OfferSummaryCard
          offer={offer}
          isExpired={isExpired}
        />

        {!isExpired &&
          offer.expires_at && (
            <OfferExpiryTimer
              expiresAt={
                offer.expires_at
              }
            />
          )}

        <OfferReceiptCard
          rows={receiptRows}
        />

        {awaitingSeller && (
  <>
    <View style={styles.waitCard}>
      <Text style={styles.waitTitle}>
        Awaiting Seller Decision
      </Text>

      <Text style={styles.waitSub}>
        Your offer has been sent. You may cancel it before the seller responds.
      </Text>
    </View>

    <OfferActionButtons
  tertiaryText="Cancel Offer"
  onTertiary={cancelOffer}
/>
  </>
)}

{awaitingBuyer && (
  <View style={styles.waitCard}>
    <Text style={styles.waitTitle}>
      Awaiting Buyer Decision
    </Text>

    <Text style={styles.waitSub}>
      Your counter offer has been sent to the buyer.
    </Text>
  </View>
)}

{canBuyerPay && (
  <OfferActionButtons
    primaryText={`Pay Now • $${buyerTotal.toFixed(
      2
    )}`}
    onPrimary={acceptOffer}
  />
)}

{canRespond && !canBuyerPay && (
  <OfferActionButtons
    primaryText={
      isSeller
        ? "Accept Offer"
        : "Accept Counter"
    }
    secondaryText="Counter"
    tertiaryText="Decline"
    onPrimary={acceptOffer}
    onSecondary={() =>
      setShowCounter(true)
    }
    onTertiary={declineOffer}
  />
)}
      </ScrollView>

      <Modal
        visible={showCounter}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Send Counter Offer
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              keyboardType="decimal-pad"
              value={counterAmount}
              onChangeText={setCounterAmount}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() =>
                  setShowCounter(false)
                }
              >
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitCounter}
              >
                <Text>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <OfferActionResultModal
        visible={resultModal.visible}
        title={resultModal.title}
        message={resultModal.message}
        primaryText={
          resultModal.primaryText
        }
        secondaryText={
          resultModal.secondaryText
        }
        onPrimary={
          resultModal.onPrimary ??
          (() => {})
        }
        onSecondary={
          resultModal.onSecondary
        }
        onClose={() =>
          setResultModal((p) => ({
            ...p,
            visible: false,
          }))
        }
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
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },

  waitCard: {
  backgroundColor: "#fff",
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#E8E8E8",
  padding: 16,
  marginBottom: 14,
},

waitTitle: {
  fontSize: 15,
  fontWeight: "800",
  color: "#111",
  marginBottom: 4,
},

waitSub: {
  fontSize: 13,
  color: "#6B7280",
  lineHeight: 18,
},

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },

  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 14,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },

  modalActions: {
    flexDirection: "row",
    justifyContent:
      "space-between",
  },
})