import { notify } from "@/lib/notifications/notify"
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

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"


/* ---------------- TYPES ---------------- */

type OfferStatus =
  | "pending"
  | "countered"
  | "accepted"
  | "declined"
  | "expired"

type Offer = {
  id: string
  buyer_id: string
  seller_id: string
  current_amount: number
  counter_count: number
  last_actor: "buyer" | "seller"
  status: OfferStatus
  created_at: string
  listings: {
    title: string
    image_urls: string[] | null
    shipping_type: "seller_pays" | "buyer_pays"
    shipping_price: number | null
  }
}

/* ---------------- SCREEN ---------------- */

export default function BuyerOfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()

  const [offer, setOffer] = useState<Offer | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [counterAmount, setCounterAmount] = useState("")
  const [showCounter, setShowCounter] = useState(false)

  useEffect(() => {
    if (!id || !session?.user?.id) {
      setLoading(false)
      return
    }
    loadOffer()
  }, [id, session?.user?.id])

  /* ---------------- LOAD OFFER ---------------- */

  const loadOffer = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("offers")
      .select(`
        id,
        buyer_id,
        seller_id,
        current_amount,
        counter_count,
        last_actor,
        status,
        created_at,
        listings (
          title,
          image_urls,
          shipping_type,
          shipping_price
        )
      `)
      .eq("id", id)
      .single<Offer>()

    if (error) {
  handleAppError(error, {
    fallbackMessage: "Failed to load offer details.",
  })
  setOffer(null)
  setLoading(false)
  return
}

if (!data) {
  setOffer(null)
  setLoading(false)
  return
}


    // 🔒 Buyer ownership check
    if (data.buyer_id !== session!.user!.id) {
      Alert.alert("Access denied", "You can only view your own offers.")
      router.replace("/buyer-hub/offers")
      return
    }

    // Prevent viewing if already paid
    const { data: paidOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("offer_id", data.id)
      .eq("status", "paid")
      .maybeSingle()

    if (paidOrder) {
      router.replace("/buyer-hub/offers")
      return
    }

    setOffer(data)
    setLoading(false)
  }

  /* ---------------- EXPIRATION ---------------- */

  const isExpired = useMemo(() => {
    if (!offer) return false
    const created = new Date(offer.created_at).getTime()
    return Date.now() > created + 24 * 60 * 60 * 1000
  }, [offer])

  if (!offer) return null

  /* ---------------- CALCULATIONS (BUYER CLEAN VIEW) ---------------- */

  const itemPrice = offer.current_amount

  const shippingCost =
    offer.listings.shipping_type === "buyer_pays"
      ? offer.listings.shipping_price ?? 0
      : 0

  // Buyer fee model (matches checkout)
  const buyerFeeRate = 0.044
  const buyerFlatFee = 0.3

  const buyerFee = Number(
    (itemPrice * buyerFeeRate + buyerFlatFee).toFixed(2)
  )

  const buyerTotal = Number(
    (itemPrice + shippingCost + buyerFee).toFixed(2)
  )

  const canRespond =
    !!offer &&
    !isExpired &&
    offer.status !== "accepted" &&
    offer.status !== "declined" &&
    offer.counter_count < 6 &&
    offer.last_actor === "seller"

  const canPay =
    offer.status === "accepted" && !isExpired

  /* ---------------- STATUS BADGE (MATCHES SELLER UX) ---------------- */

  const renderStatusBadge = () => {
    if (isExpired) return <Badge text="Expired" color="#C0392B" />

    if (offer.status === "accepted") {
      return (
        <Badge
          text="Accepted • Complete payment"
          color="#1F7A63"
        />
      )
    }

    if (offer.status === "declined") {
      return <Badge text="Declined" color="#EB5757" />
    }

    if (offer.status === "countered") {
      if (offer.last_actor === "buyer") {
        return (
          <Badge
            text="Counter sent • Waiting on seller"
            color="#E67E22"
          />
        )
      }
      if (offer.last_actor === "seller") {
        return (
          <Badge
            text="Seller countered • Your response needed"
            color="#2980B9"
          />
        )
      }
    }

    return null
  }

  /* ---------------- ACTIONS ---------------- */

  const goToPay = () => {
    router.push({
      pathname: "/checkout",
      params: { offerId: offer.id },
    })
  }

  const acceptOffer = async () => {
    if (saving || isExpired) return
    setSaving(true)

    const { error } = await supabase
      .from("offers")
      .update({
        status: "accepted",
        last_actor: "buyer",
        last_action: "accepted",
        accepted_price: offer.current_amount,
        accepted_title: offer.listings.title,
        accepted_image_url: offer.listings.image_urls?.[0] ?? null,
        accepted_shipping_type: offer.listings.shipping_type,
        accepted_shipping_price:
          offer.listings.shipping_type === "buyer_pays"
            ? offer.listings.shipping_price ?? 0
            : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", offer.id)

    setSaving(false)

    if (error) {
  handleAppError(error, {
    fallbackMessage: "Failed to accept offer. Please try again.",
  })
  return
}


    await notify({
      userId: offer.seller_id,
      type: "offer",
      title: "Offer accepted!",
      body: "The buyer accepted your offer.",
      data: {
        route: "/seller-hub/offers/[id]",
        params: { id: offer.id },
      },
    })

    loadOffer()
  }

  const declineOffer = async () => {
    if (saving) return
    setSaving(true)

    const { error } = await supabase
  .from("offers")
  .update({
    status: "declined",
    last_actor: "buyer",
    last_action: "declined",
    updated_at: new Date().toISOString(),
  })
  .eq("id", offer.id)

if (error) {
  handleAppError(error, {
    fallbackMessage: "Failed to decline offer. Please try again.",
  })
  setSaving(false)
  return
}

    await notify({
      userId: offer.seller_id,
      type: "offer",
      title: "Offer declined",
      body: "The buyer declined your offer.",
      data: {
        route: "/seller-hub/offers",
      },
    })

    loadOffer()
  }

  const submitCounter = async () => {
    if (!offer || saving) return

    const amount = parseFloat(counterAmount.trim())

    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Enter a valid counter amount")
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from("offers")
      .update({
        current_amount: amount,
        counter_amount: amount,
        counter_count: offer.counter_count + 1,
        last_actor: "buyer",
        last_action: "countered",
        status: "countered",
        updated_at: new Date().toISOString(),
      })
      .eq("id", offer.id)

    setSaving(false)

    if (error) {
  handleAppError(error, {
    fallbackMessage: "Failed to send counter offer. Please try again.",
  })
  return
}


    setShowCounter(false)
    setCounterAmount("")

    await notify({
      userId: offer.seller_id,
      type: "offer",
      title: "Offer countered",
      body: "The buyer sent a counter offer.",
      data: {
        route: "/seller-hub/offers/[id]",
        params: { id: offer.id },
      },
    })

    loadOffer()
  }

  /* ---------------- UI ---------------- */

if (loading) return <ActivityIndicator style={{ marginTop: 80 }} />

return (
  <View style={styles.screen}>
    <AppHeader
      title="Offer"
      backRoute="/buyer-hub/offers"
    />

    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      bounces
    >
      <View style={styles.card}>
        <Image
          source={{
            uri:
              offer.listings.image_urls?.[0] ??
              "https://via.placeholder.com/300",
          }}
          style={styles.image}
        />

        <Text style={styles.title}>
          {offer.listings.title}
        </Text>

        {renderStatusBadge()}

        {/* BUYER RECEIPT */}
        <View style={styles.receipt}>
          <Row
            label="Offer Price"
            value={`$${itemPrice.toFixed(2)}`}
          />

          <Row
            label="Shipping"
            value={
              shippingCost > 0
                ? `$${shippingCost.toFixed(2)}`
                : "Free / Included"
            }
          />

          <Row
            label="Buyer Protection & Processing"
            value={`$${buyerFee.toFixed(2)}`}
          />

          <View style={styles.divider} />

          <Row
            label="Total Due at Checkout"
            value={`$${buyerTotal.toFixed(2)}`}
            bold
          />
        </View>

        {canPay && (
          <View style={styles.acceptedBox}>
            <TouchableOpacity
              style={styles.payBtn}
              onPress={goToPay}
            >
              <Text style={styles.payText}>
                Pay Now • ${buyerTotal.toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 🔥 GAP between receipt card and action buttons */}
        <View style={{ height: 28 }} />

        {/* 🔥 ACTION BUTTONS NOW SCROLL WITH CONTENT (no absolute positioning) */}
        {canRespond && (
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={acceptOffer}
            >
              <Text style={styles.acceptText}>
                Accept Offer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setShowCounter(true)}
            >
              <Text style={styles.counterText}>
                Counter
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineBtn}
              onPress={declineOffer}
            >
              <Text style={styles.declineText}>
                Decline
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* bottom breathing room so buttons aren't tight to screen edge */}
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>

    {/* COUNTER MODAL (UNCHANGED) */}
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
              <Text style={styles.modalCancelText}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalConfirm}
              onPress={submitCounter}
            >
              <Text style={styles.modalConfirmText}>
                Send
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </View>
)
}

/* ---------------- HELPERS ---------------- */

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

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>
        {text}
      </Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F7F8",
  },

  content: {
    padding: 16,
    paddingBottom: 200, // keeps action bar above bottom nav
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  image: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: "#EEE",
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
    color: "#0F1E17",
  },

  /* ---------- STATUS BADGE ---------- */

  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
  },

  badgeText: {
    fontWeight: "800",
    fontSize: 12,
  },

  /* ---------- RECEIPT (BUYER + SELLER SHARED STYLE) ---------- */

  receipt: {
    backgroundColor: "#F0FAF6",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#CFE5DA",
    marginTop: 4,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7, // slightly more spacing = premium feel
  },

  rowLabel: {
    color: "#6B8F7D",
    fontWeight: "600",
    fontSize: 14,
  },

  rowValue: {
    fontWeight: "700",
    color: "#0F1E17",
    fontSize: 14,
  },

  // Used for bold totals (Buyer Total / You Receive)
  rowValueBold: {
    fontWeight: "900",
    color: "#1F7A63",
    fontSize: 16,
  },

  divider: {
    height: 1,
    backgroundColor: "#CFE5DA",
    marginVertical: 10,
  },

  /* ---------- ACCEPTED / PAY BOX (REQUIRED FOR BUYER PAGE) ---------- */

  acceptedBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#1F7A63",
  },

  payBtn: {
    backgroundColor: "#1F7A63",
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: "#1F7A63",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },

  payText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#fff",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  /* ---------- ACTION BAR (BOTTOM BUTTON STACK) ---------- */

  actionBar: {
  gap: 10,
  marginTop: 8,
},

  acceptBtn: {
    backgroundColor: "#1F7A63",
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: "#1F7A63",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },

  acceptText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#fff",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  counterBtn: {
    backgroundColor: "#E8F5EE",
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#1F7A63",
  },

  counterText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#1F7A63",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  declineBtn: {
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#EB5757",
  },

  declineText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#EB5757",
    fontSize: 15,
    letterSpacing: 0.3,
  },

  /* ---------- COUNTER MODAL (IDENTICAL TO SELLER) ---------- */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },

  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
    color: "#0F1E17",
  },

  input: {
    backgroundColor: "#F4F4F4",
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F1E17",
  },

  modalActions: {
    flexDirection: "row",
    marginTop: 20,
    gap: 10,
  },

  modalCancel: {
    flex: 1,
    padding: 13,
    borderRadius: 12,
    backgroundColor: "#E4EFEA",
    alignItems: "center",
  },

  modalCancelText: {
    fontWeight: "700",
    color: "#2E5F4F",
    fontSize: 14,
  },

  modalConfirm: {
    flex: 1,
    padding: 13,
    borderRadius: 12,
    backgroundColor: "#1F7A63",
    alignItems: "center",
  },

  modalConfirmText: {
    fontWeight: "900",
    color: "#fff",
    fontSize: 14,
  },
})
