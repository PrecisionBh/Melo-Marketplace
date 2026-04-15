import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

type OfferStatus =
  | "pending"
  | "countered"
  | "accepted"
  | "declined"
  | "expired"

type Offer = {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  current_amount: number
  quantity: number
  counter_count: number
  last_actor: "buyer" | "seller"
  status: OfferStatus
  created_at: string
  updated_at?: string | null

  accepted_price?: number | null
  accepted_title?: string | null
  accepted_image_url?: string | null
  accepted_shipping_type?: "seller_pays" | "buyer_pays" | null
  accepted_shipping_price?: number | null

  listings: {
    id: string
    title: string
    image_urls: string[] | null
    shipping_type: "seller_pays" | "buyer_pays"
    shipping_price: number | null
    is_sold?: boolean
  } | null
}

export default function OfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [offer, setOffer] = useState<Offer | null>(null)
  const [showCounter, setShowCounter] = useState(false)
  const [counterAmount, setCounterAmount] = useState("")

  useEffect(() => {
    if (id && session?.user?.id) {
      loadOffer()
    } else {
      setLoading(false)
    }
  }, [id, session?.user?.id])

  const loadOffer = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("offers")
        .select(`
          id,
          listing_id,
          buyer_id,
          seller_id,
          current_amount,
          quantity,
          counter_count,
          last_actor,
          status,
          created_at,
          updated_at,
          accepted_price,
          accepted_title,
          accepted_image_url,
          accepted_shipping_type,
          accepted_shipping_price,
          listings (
            id,
            title,
            image_urls,
            shipping_type,
            shipping_price,
            is_sold
          )
        `)
        .eq("id", id)
        .single<Offer>()

      if (error) throw error
      if (!data) throw new Error("Offer not found")

      const userId = session?.user?.id

      if (
        userId !== data.buyer_id &&
        userId !== data.seller_id
      ) {
        Alert.alert("Access denied")
        router.back()
        return
      }

      setOffer(data)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load offer.",
      })
      setOffer(null)
    } finally {
      setLoading(false)
    }
  }

  const userId = session?.user?.id
  const isBuyer = offer?.buyer_id === userId
  const isSeller = offer?.seller_id === userId

  const isExpired = useMemo(() => {
    if (!offer) return false
    const created = new Date(offer.created_at).getTime()
    return Date.now() > created + 24 * 60 * 60 * 1000
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

  const displayTitle =
    offer.accepted_title ||
    offer.listings?.title ||
    "Offer"

  const displayImage =
    offer.accepted_image_url ||
    offer.listings?.image_urls?.[0] ||
    "https://via.placeholder.com/300"

  const unitPrice =
    offer.status === "accepted" &&
    offer.accepted_price != null
      ? offer.accepted_price
      : offer.current_amount

  const itemTotal = unitPrice * quantity

  const shippingType =
    offer.status === "accepted" &&
    offer.accepted_shipping_type
      ? offer.accepted_shipping_type
      : offer.listings?.shipping_type ?? "seller_pays"

  const shippingPrice =
    offer.status === "accepted" &&
    offer.accepted_shipping_price != null
      ? offer.accepted_shipping_price
      : offer.listings?.shipping_price ?? 0

  const shippingCost =
    shippingType === "buyer_pays"
      ? shippingPrice ?? 0
      : 0

  const buyerFeeRate = 0.044
  const buyerFlatFee = 0.3

  const buyerFee = Number(
    (itemTotal * buyerFeeRate + buyerFlatFee).toFixed(2)
  )

  const buyerTotal = Number(
    (itemTotal + shippingCost + buyerFee).toFixed(2)
  )

  const sellerFeeRate = 0.05
  const sellerFee = Number(
    ((itemTotal + shippingCost) * sellerFeeRate).toFixed(2)
  )

  const sellerPayout = Number(
    (itemTotal + shippingCost - sellerFee).toFixed(2)
  )

  const canBuyerRespond =
    isBuyer &&
    !isExpired &&
    offer.status !== "accepted" &&
    offer.status !== "declined" &&
    offer.counter_count < 6 &&
    offer.last_actor === "seller"

  const canSellerRespond =
    isSeller &&
    !isExpired &&
    offer.status !== "accepted" &&
    offer.status !== "declined" &&
    offer.counter_count < 6 &&
    offer.last_actor === "buyer"

  const canBuyerCancel =
    isBuyer &&
    !isExpired &&
    (offer.status === "pending" ||
      offer.status === "countered")

  const canBuyerPay =
    isBuyer &&
    offer.status === "accepted" &&
    !isExpired

  const renderStatusBadge = () => {
    if (offer.listings?.is_sold && offer.status !== "accepted") {
      return (
        <View style={[styles.badge, { borderColor: "#C0392B" }]}>
          <Text style={[styles.badgeText, { color: "#C0392B" }]}>
            Item Sold
          </Text>
        </View>
      )
    }

    if (isExpired) {
      return (
        <View style={[styles.badge, { borderColor: "#C0392B" }]}>
          <Text style={[styles.badgeText, { color: "#C0392B" }]}>
            Expired
          </Text>
        </View>
      )
    }

    if (offer.status === "accepted") {
      return (
        <View style={[styles.badge, { borderColor: "#1F7A63" }]}>
          <Text style={[styles.badgeText, { color: "#1F7A63" }]}>
            Accepted • Waiting on payment
          </Text>
        </View>
      )
    }

    if (offer.status === "declined") {
      return (
        <View style={[styles.badge, { borderColor: "#EB5757" }]}>
          <Text style={[styles.badgeText, { color: "#EB5757" }]}>
            Declined
          </Text>
        </View>
      )
    }

    if (offer.status === "countered") {
      if (offer.last_actor === "buyer") {
        return (
          <View style={[styles.badge, { borderColor: "#E67E22" }]}>
            <Text style={[styles.badgeText, { color: "#E67E22" }]}>
              Buyer Countered
            </Text>
          </View>
        )
      }

      if (offer.last_actor === "seller") {
        return (
          <View style={[styles.badge, { borderColor: "#2980B9" }]}>
            <Text style={[styles.badgeText, { color: "#2980B9" }]}>
              Seller Countered
            </Text>
          </View>
        )
      }
    }

    return (
      <View style={[styles.badge, { borderColor: "#6B7280" }]}>
        <Text style={[styles.badgeText, { color: "#6B7280" }]}>
          Pending Offer
        </Text>
      </View>
    )
  }

  const acceptOffer = async () => {
    if (!offer || saving || isExpired) return

    try {
      setSaving(true)

      const updatePayload = {
        status: "accepted",
        last_actor: isBuyer ? "buyer" : "seller",
        last_action: "accepted",
        accepted_price: offer.current_amount,
        accepted_title: offer.listings?.title ?? displayTitle,
        accepted_image_url:
          offer.listings?.image_urls?.[0] ?? null,
        accepted_shipping_type:
          offer.listings?.shipping_type ?? "seller_pays",
        accepted_shipping_price:
          offer.listings?.shipping_type === "buyer_pays"
            ? offer.listings?.shipping_price ?? 0
            : 0,
        updated_at: new Date().toISOString(),
      }

      let query = supabase
        .from("offers")
        .update(updatePayload)
        .eq("id", offer.id)

      if (isBuyer) {
        query = query.eq("status", "countered")
      }

      const { error } = await query
      if (error) throw error

      if (isSeller) {
        try {
          await supabase.functions.invoke("send-notification", {
            body: {
              userId: offer.buyer_id,
              type: "offer",
              title: "Offer accepted!",
              body: "Your offer was accepted. Complete payment to secure the item.",
              data: {
                route: "/offer/[id]",
                params: { id: offer.id },
              },
              dedupeKey: `offer-accepted-buyer-${offer.id}`,
            },
          })
        } catch {}
      }

      if (isBuyer) {
        try {
          await supabase.functions.invoke("send-notification", {
            body: {
              userId: offer.seller_id,
              type: "offer",
              title: "Counter accepted!",
              body: "The buyer accepted your counter offer.",
              data: {
                route: "/offer/[id]",
                params: { id: offer.id },
              },
              dedupeKey: `offer-accepted-seller-${offer.id}`,
            },
          })
        } catch {}
      }

      await loadOffer()
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to accept offer.",
      })
    } finally {
      setSaving(false)
    }
  }

  const declineOffer = async () => {
    if (!offer || saving) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from("offers")
        .update({
          status: "declined",
          last_actor: isBuyer ? "buyer" : "seller",
          last_action: "declined",
          updated_at: new Date().toISOString(),
        })
        .eq("id", offer.id)

      if (error) throw error

      try {
        await supabase.functions.invoke("send-notification", {
          body: {
            userId: isBuyer ? offer.seller_id : offer.buyer_id,
            type: "offer",
            title: "Offer declined",
            body: isBuyer
              ? "The buyer declined your counter offer."
              : "The seller declined your offer.",
            data: {
              route: "/offer/[id]",
              params: { id: offer.id },
            },
            dedupeKey: `offer-declined-${offer.id}-${isBuyer ? "buyer" : "seller"}`,
          },
        })
      } catch {}

      await loadOffer()
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to decline offer.",
      })
    } finally {
      setSaving(false)
    }
  }

  const cancelOffer = async () => {
    if (!offer || saving) return

    Alert.alert(
      "Cancel Offer",
      "Are you sure you want to cancel this offer?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true)

              const { error } = await supabase
                .from("offers")
                .update({
                  status: "declined",
                  last_actor: "buyer",
                  last_action: "cancelled",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", offer.id)
                .eq("buyer_id", session?.user?.id)

              if (error) throw error

              try {
                await supabase.functions.invoke("send-notification", {
                  body: {
                    userId: offer.seller_id,
                    type: "offer",
                    title: "Offer cancelled",
                    body: "The buyer cancelled their offer.",
                    data: {
                      route: "/offer/[id]",
                      params: { id: offer.id },
                    },
                    dedupeKey: `offer-cancelled-${offer.id}`,
                  },
                })
              } catch {}

              await loadOffer()
            } catch (err) {
              handleAppError(err, {
                fallbackMessage: "Failed to cancel offer.",
              })
            } finally {
              setSaving(false)
            }
          },
        },
      ]
    )
  }

  const submitCounter = async () => {
    if (!offer || saving || isExpired) return

    const amount = Number(counterAmount)

    if (!amount || amount <= 0) {
      Alert.alert("Enter a valid counter amount")
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from("offers")
        .update({
          current_amount: amount,
          counter_amount: amount,
          counter_count: offer.counter_count + 1,
          last_actor: isBuyer ? "buyer" : "seller",
          last_action: "countered",
          status: "countered",
          updated_at: new Date().toISOString(),
        })
        .eq("id", offer.id)

      if (error) throw error

      setShowCounter(false)
      setCounterAmount("")

      try {
        await supabase.functions.invoke("send-notification", {
          body: {
            userId: isBuyer ? offer.seller_id : offer.buyer_id,
            type: "offer",
            title: "Offer countered",
            body: isBuyer
              ? "The buyer sent a counter offer."
              : "The seller sent a counter offer.",
            data: {
              route: "/offer/[id]",
              params: { id: offer.id },
            },
            dedupeKey: `offer-countered-${offer.id}-${isBuyer ? "buyer" : "seller"}`,
          },
        })
      } catch {}

      await loadOffer()
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to send counter offer.",
      })
    } finally {
      setSaving(false)
    }
  }

  const goToPay = () => {
    router.push({
      pathname: "/checkout",
      params: { offerId: offer.id },
    })
  }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Image
            source={{ uri: displayImage }}
            style={styles.image}
          />

          <Text style={styles.title}>{displayTitle}</Text>

          <Text style={styles.subText}>
            Offer ID: {offer.id}
          </Text>

          {renderStatusBadge()}

          <View style={styles.receipt}>
            <Row
              label="Unit Price"
              value={`$${unitPrice.toFixed(2)}`}
            />
            <Row
              label="Quantity"
              value={`x${quantity}`}
            />
            <Row
              label="Offer Total"
              value={`$${itemTotal.toFixed(2)}`}
            />
            <Row
              label="Shipping"
              value={
                shippingCost > 0
                  ? `$${shippingCost.toFixed(2)}`
                  : "Free / Included"
              }
            />

            <View style={styles.divider} />

            {isBuyer ? (
              <>
                <Row
                  label="Buyer Protection & Processing"
                  value={`$${buyerFee.toFixed(2)}`}
                />
                <Row
                  label="Total Due"
                  value={`$${buyerTotal.toFixed(2)}`}
                  bold
                />
              </>
            ) : (
              <>
                <Row
                  label="Seller Fee (5%)"
                  value={`-$${sellerFee.toFixed(2)}`}
                />
                <Row
                  label="You Receive"
                  value={`$${sellerPayout.toFixed(2)}`}
                  bold
                />
              </>
            )}
          </View>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Logic Note</Text>
          <Text style={styles.noteText}>
            Once an offer is accepted, the buyer must complete payment
            before the order is officially created and processed. This
            page handles the negotiation flow first, then pushes the
            buyer into checkout.
          </Text>
        </View>

        {canBuyerPay && (
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={goToPay}
            disabled={saving}
          >
            <Text style={styles.acceptText}>
              Pay Now • ${buyerTotal.toFixed(2)}
            </Text>
          </TouchableOpacity>
        )}

        {(canSellerRespond || canBuyerRespond) && (
          <View style={styles.actionStack}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={acceptOffer}
              disabled={saving}
            >
              <Text style={styles.acceptText}>
                {isSeller ? "Accept Offer" : "Accept Counter"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setShowCounter(true)}
              disabled={saving}
            >
              <Text style={styles.counterText}>Counter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineBtn}
              onPress={declineOffer}
              disabled={saving}
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {canBuyerCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={cancelOffer}
            disabled={saving}
          >
            <Text style={styles.cancelText}>Cancel Offer</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={showCounter} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Send Counter Offer
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter counter amount"
              keyboardType="decimal-pad"
              value={counterAmount}
              onChangeText={setCounterAmount}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowCounter(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={submitCounter}
              >
                <Text style={styles.modalConfirmText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <GlobalFooter />
    </View>
  )
}

function Row({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          bold && styles.rowValueBold,
        ]}
      >
        {value}
      </Text>
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

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  image: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: "#EEE",
    marginBottom: 14,
  },

  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111",
    marginBottom: 4,
  },

  subText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },

  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 14,
    backgroundColor: "#fff",
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  receipt: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },

  rowLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },

  rowValue: {
    fontSize: 14,
    color: "#111",
    fontWeight: "700",
  },

  rowValueBold: {
    fontSize: 16,
    color: "#111",
    fontWeight: "900",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },

  noteCard: {
    backgroundColor: "#fff7ed",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },

  noteTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#9A3412",
    marginBottom: 6,
  },

  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#7C2D12",
    fontWeight: "600",
  },

  actionStack: {
    gap: 10,
    marginBottom: 12,
  },

  acceptBtn: {
    backgroundColor: "#D97732",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 10,
  },

  acceptText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },

  counterBtn: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#D97732",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },

  counterText: {
    color: "#D97732",
    fontWeight: "900",
    fontSize: 15,
  },

  declineBtn: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#DC2626",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },

  declineText: {
    color: "#DC2626",
    fontWeight: "900",
    fontSize: 15,
  },

  cancelBtn: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#6B7280",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },

  cancelText: {
    color: "#374151",
    fontWeight: "900",
    fontSize: 15,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },

  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111",
    marginBottom: 12,
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 16,
    marginBottom: 8,
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  modalCancel: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },

  modalCancelText: {
    color: "#111",
    fontWeight: "800",
  },

  modalConfirm: {
    flex: 1,
    backgroundColor: "#D97732",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },

  modalConfirmText: {
    color: "#fff",
    fontWeight: "900",
  },
})