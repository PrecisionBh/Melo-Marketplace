import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
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

    if (error || !data) {
      setOffer(null)
      setLoading(false)
      return
    }

    if (data.buyer_id !== session!.user!.id) {
      Alert.alert("Access denied", "You can only view your own offers.")
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

<<<<<<< cleanup-escrow-reset
  const itemPrice = offer?.current_amount ?? 0

  const buyerProtectionFee = Number((itemPrice * 0.015).toFixed(2))
  const stripeProcessingFee = Number((itemPrice * 0.029 + 0.3).toFixed(2))

  const buyerTotal =
    itemPrice +
    shippingCost +
    buyerProtectionFee +
    stripeProcessingFee
=======
 const itemPrice = offer?.current_amount ?? 0

// Buyer fees (item price ONLY)
const buyerProtectionFee = Number((itemPrice * 0.015).toFixed(2))
const stripeProcessingFee = Number((itemPrice * 0.029 + 0.3).toFixed(2))
const buyerFeeTotal = buyerProtectionFee + stripeProcessingFee

const buyerTotal = Number(
  (itemPrice + shippingCost + buyerFeeTotal).toFixed(2)
)
>>>>>>> main

  const canRespond =
    !!offer &&
    !isExpired &&
    !offerIsFinal &&
    offer.counter_count < 6 &&
    offer.last_actor === "seller"

  const canPay =
    !!offer &&
    offer.status === "accepted" &&
    !isExpired

  /* ---------------- ACTIONS ---------------- */

  const goToPay = () => {
    if (!offer) return
    router.push({
      pathname: "/checkout",
      params: { offerId: offer.id },
    })
  }

  const acceptOffer = async () => {
    if (!offer || saving) return

    setSaving(true)

    const { error } = await supabase
      .from("offers")
      .update({
        status: "accepted",
        last_actor: "buyer",
        last_action: "accepted",

        // 🔒 SNAPSHOT DATA
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
      Alert.alert("Failed to accept offer", error.message)
      return
    }

    loadOffer()
  }

  const declineOffer = async () => {
    if (!offer || saving) return

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

          loadOffer()
        },
      },
    ])
  }

  const submitCounter = async () => {
    if (!offer || saving) return

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
    loadOffer()
  }

  /* ---------------- UI ---------------- */

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 80 }} />
  }

  if (!offer) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>This offer is no longer available.</Text>
        <TouchableOpacity
          style={styles.browseBtn}
          onPress={() => router.replace("/home")}
        >
          <Text style={styles.browseText}>Back to Browsing</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
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
<<<<<<< cleanup-escrow-reset
            <Row label="Item price" value={`$${itemPrice.toFixed(2)}`} />
            <Row
              label="Shipping"
              value={
                shippingCost === 0
                  ? "Free"
                  : `$${shippingCost.toFixed(2)}`
              }
            />
            <Row
              label="Buyer protection (1.5%)"
              value={`$${buyerProtectionFee.toFixed(2)}`}
            />
            <Row
              label="Processing fee (2.9% + $0.30)"
              value={`$${stripeProcessingFee.toFixed(2)}`}
            />
            <Row
              label="Total due"
              value={`$${buyerTotal.toFixed(2)}`}
              bold
            />
          </View>
=======
  <Row label="Item price" value={`$${itemPrice.toFixed(2)}`} />

  <Row
    label="Shipping"
    value={
      shippingCost === 0 ? "Free" : `$${shippingCost.toFixed(2)}`
    }
  />

  <Row
    label="Buyer protection (1.5%)"
    value={`$${buyerProtectionFee.toFixed(2)}`}
  />

  <Row
    label="Processing fee"
    value={`$${stripeProcessingFee.toFixed(2)}`}
  />

  <Row label="Total due" value={`$${buyerTotal.toFixed(2)}`} bold />
</View>

>>>>>>> main

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
        </View>
      </View>
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

  content: {
    padding: 16,
    paddingBottom: 180, // keeps Pay button clear of bottom nav
  },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    fontWeight: "800",
    color: "#6B8F7D",
    marginBottom: 14,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },

  image: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    marginBottom: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },

  /* ---------- RECEIPT ---------- */

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

  rowLabel: {
    color: "#6B8F7D",
    fontWeight: "600",
  },

  rowValue: {
    fontWeight: "700",
  },

  feeRowLabel: {
    color: "#8FAEA1",
    fontWeight: "600",
  },

  feeRowValue: {
    color: "#2E5F4F",
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: "#CFE5DA",
    marginVertical: 8,
  },

  /* ---------- ACCEPTED ---------- */

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
    paddingVertical: 14,
    borderRadius: 16,
  },

  payText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#fff",
  },

  expired: {
    marginTop: 10,
    color: "#C0392B",
    fontWeight: "800",
  },

  /* ---------- BROWSE ---------- */

  browseBtn: {
    marginTop: 20,
    backgroundColor: "#7FAF9B",
    paddingVertical: 14,
    borderRadius: 16,
  },

  browseText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#0F1E17",
  },
})


