import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type OfferStatus = "pending" | "countered" | "accepted" | "declined" | "expired"

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

type PaymentLink = {
  id: string
  offer_id: string
  status: "pending" | "paid"
}

/* ---------------- SCREEN ---------------- */

export default function BuyerOfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()

  const [offer, setOffer] = useState<Offer | null>(null)
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      .single()
      .returns<Offer>()

    if (error || !data) {
      setOffer(null)
      setPaymentLink(null)
      setLoading(false)
      return
    }

    // ✅ Access control: buyer only
    if (data.buyer_id !== session!.user!.id) {
      setLoading(false)
      Alert.alert("Access denied", "You can only view your own offers.")
      router.replace("/buyer-hub/offers")
      return
    }

    setOffer(data)

    // ✅ Load payment link if accepted (optional — UI will still allow pay even if missing)
    if (data.status === "accepted") {
      const { data: linkData } = await supabase
        .from("payment_links")
        .select("id, offer_id, status")
        .eq("offer_id", data.id)
        .maybeSingle()
        .returns<PaymentLink>()

      setPaymentLink(linkData ?? null)
    } else {
      setPaymentLink(null)
    }

    setLoading(false)
  }

  /* ---------------- EXPIRATION (24h) ---------------- */

  const isExpired = useMemo(() => {
    if (!offer) return false
    const created = new Date(offer.created_at).getTime()
    return Date.now() > created + 24 * 60 * 60 * 1000
  }, [offer])

  const offerIsFinal =
    offer?.status === "accepted" ||
    offer?.status === "declined" ||
    offer?.status === "expired"

  /* ---------------- CALCULATIONS ---------------- */

  const shippingCost = useMemo(() => {
    if (!offer) return 0
    return offer.listings.shipping_type === "buyer_pays"
      ? offer.listings.shipping_price ?? 0
      : 0
  }, [offer])

  const itemPrice = offer?.current_amount ?? 0
  const buyerTotal = itemPrice + shippingCost

  // ✅ Buyer can respond only when:
  // - not expired
  // - offer not final (accepted/declined/expired)
  // - less than 6 counters
  // - seller acted last (so it’s buyer’s turn)
  const canRespond =
    !!offer &&
    !isExpired &&
    !offerIsFinal &&
    offer.counter_count < 6 &&
    offer.last_actor === "seller"

  // ✅ Buyer can pay when accepted and not expired and not already paid
  const canPay =
    !!offer &&
    offer.status === "accepted" &&
    !isExpired &&
    paymentLink?.status !== "paid"

  const alreadyPaid =
    !!offer && offer.status === "accepted" && paymentLink?.status === "paid"

  /* ---------------- ACTIONS ---------------- */

  const goToPay = () => {
    if (!offer) return

    // ✅ IMPORTANT: checkout.tsx expects query params (offerId / listingId)
    router.push({
      pathname: "/checkout",
      params: { offerId: offer.id },
    })
  }

  const declineOffer = async () => {
    if (!offer) return
    if (saving) return

    // hard guard even if button visible bug
    if (isExpired || offerIsFinal) {
      Alert.alert("Not available", "This offer can no longer be declined.")
      return
    }
    if (offer.last_actor !== "seller") {
      Alert.alert("Please wait", "The seller is waiting on your counter.")
      return
    }

    Alert.alert("Decline offer?", "This will end the negotiation.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
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

          setSaving(false)

          if (error) {
            Alert.alert("Failed to decline offer", error.message)
            return
          }

          router.replace("/buyer-hub/offers")
        },
      },
    ])
  }

  const submitCounter = async () => {
    if (!offer) return
    if (saving) return

    // hard guards
    if (!canRespond) {
      Alert.alert("Not available", "You can’t counter this offer right now.")
      return
    }

    const amount = Number(counterAmount)
    if (!amount || amount <= 0) {
      Alert.alert("Enter a valid amount")
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
      Alert.alert("Failed to counter offer", error.message)
      return
    }

    setShowCounter(false)
    setCounterAmount("")
    router.replace("/buyer-hub/offers")
  }

  /* ---------------- UI ---------------- */

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 80 }} />
  }

  if (!offer) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>This offer is no longer available.</Text>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offer</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Image
            source={{
              uri:
                offer.listings.image_urls?.[0] ??
                "https://via.placeholder.com/300",
            }}
            style={styles.image}
          />

          <Text style={styles.title}>{offer.listings.title}</Text>

          <View style={styles.receipt}>
            <Row label="Item price" value={`$${itemPrice.toFixed(2)}`} />
            <Row
              label="Shipping"
              value={
                shippingCost === 0 ? "Free" : `$${shippingCost.toFixed(2)}`
              }
            />
            <Row label="Total due" value={`$${buyerTotal.toFixed(2)}`} bold />
          </View>

          {/* ✅ ACCEPTED STATE (PAYMENT FIRST-CLASS) */}
          {offer.status === "accepted" && (
            <View style={styles.acceptedBox}>
              <Text style={styles.acceptedTitle}>Offer Accepted 🎉</Text>

              {alreadyPaid ? (
                <Text style={styles.acceptedText}>
                  Payment completed. You’re all set ✅
                </Text>
              ) : (
                <>
                  <Text style={styles.acceptedText}>
                    The seller accepted your offer. Complete payment to finalize
                    the purchase.
                  </Text>

                  <TouchableOpacity
                    style={[styles.payBtn, (!canPay || saving) && { opacity: 0.6 }]}
                    onPress={goToPay}
                    disabled={!canPay || saving}
                  >
                    <Text style={styles.payText}>
                      Pay Now • ${buyerTotal.toFixed(2)}
                    </Text>
                  </TouchableOpacity>

                  {isExpired && (
                    <Text style={styles.expired}>
                      This offer expired before payment was completed.
                    </Text>
                  )}
                </>
              )}
            </View>
          )}

          {/* Expired label for non-accepted states */}
          {isExpired && offer.status !== "accepted" && (
            <Text style={styles.expired}>This offer has expired.</Text>
          )}
        </View>
      </View>

      {/* ACTIONS */}
      {canRespond && (
        <View style={styles.actionBar}>
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

      {/* COUNTER MODAL */}
      <Modal transparent visible={showCounter} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Counter Offer</Text>

            <TextInput
              placeholder="New amount"
              keyboardType="decimal-pad"
              value={counterAmount}
              onChangeText={setCounterAmount}
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowCounter(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirm, saving && { opacity: 0.7 }]}
                onPress={submitCounter}
                disabled={saving}
              >
                <Text style={styles.modalConfirmText}>Submit</Text>
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
      <Text style={[styles.rowValue, bold && { fontWeight: "900" }]}>
        {value}
      </Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F7F8" },
  header: {
    height: 90,
    backgroundColor: "#7FAF9B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  headerTitle: { fontSize: 16, fontWeight: "900" },
  content: { padding: 16 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontWeight: "800", color: "#6B8F7D" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  image: { width: "100%", height: 220, borderRadius: 14, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "900", marginBottom: 12 },
  receipt: {
    backgroundColor: "#F0FAF6",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#CFE5DA",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowLabel: { color: "#6B8F7D", fontWeight: "600" },
  rowValue: { fontWeight: "700" },
  expired: { marginTop: 10, color: "#C0392B", fontWeight: "800" },

  acceptedBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#1F7A63",
  },
  acceptedTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1F7A63",
    marginBottom: 6,
  },
  acceptedText: {
    fontSize: 13,
    color: "#2E5F4F",
    marginBottom: 12,
  },
  payBtn: {
    backgroundColor: "#1F7A63",
    paddingVertical: 14,
    borderRadius: 16,
  },
  payText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#fff",
  },

  actionBar: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 16,
    gap: 10,
  },
  counterBtn: {
    backgroundColor: "#E8F5EE",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F7A63",
  },
  counterText: { textAlign: "center", fontWeight: "900", color: "#1F7A63" },
  declineBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EB5757",
    backgroundColor: "#fff",
  },
  declineText: { textAlign: "center", fontWeight: "900", color: "#EB5757" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: "900", marginBottom: 10 },
  input: { backgroundColor: "#F4F4F4", padding: 14, borderRadius: 10 },
  modalActions: { flexDirection: "row", marginTop: 20, gap: 10 },
  modalCancel: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#E4EFEA",
    alignItems: "center",
  },
  modalCancelText: { fontWeight: "700", color: "#2E5F4F" },
  modalConfirm: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#1F7A63",
    alignItems: "center",
  },
  modalConfirmText: { fontWeight: "900", color: "#fff" },
})
