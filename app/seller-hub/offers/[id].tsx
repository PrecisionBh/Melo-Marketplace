import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
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

type OfferStatus =
  | "pending"
  | "countered"
  | "accepted"
  | "declined"

type Offer = {
  id: string
  seller_id: string
  buyer_id: string
  current_amount: number
  counter_count: number
  last_actor: "buyer" | "seller"
  status: OfferStatus
  listings: {
    title: string
    image_urls: string[] | null
    shipping_type: "seller_pays" | "buyer_pays"
    shipping_price: number | null
  }
}

/* ---------------- SCREEN ---------------- */

export default function SellerOfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()

  const [offer, setOffer] = useState<Offer | null>(null)
  const [loading, setLoading] = useState(true)
  const [counterAmount, setCounterAmount] = useState("")
  const [showCounter, setShowCounter] = useState(false)

  useEffect(() => {
    if (id && session?.user?.id) loadOffer()
  }, [id, session?.user?.id])

  /* ---------------- LOAD OFFER ---------------- */

  const loadOffer = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("offers")
      .select(`
        id,
        seller_id,
        buyer_id,
        current_amount,
        counter_count,
        last_actor,
        status,
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
      router.back()
      return
    }

    if (data.seller_id !== session?.user?.id) {
      Alert.alert("Access denied", "You are not authorized to view this offer.")
      router.replace("../seller-hub/offers")
      return
    }

    setOffer(data)
    setLoading(false)
  }

  /* ---------------- CALCULATIONS ---------------- */

  if (!offer) return null

  const shippingCost =
    offer.listings.shipping_type === "buyer_pays"
      ? offer.listings.shipping_price ?? 0
      : 0

  // Offer amount = item price agreed upon
  const itemPrice = offer.current_amount

  // Buyer total = item + shipping
  const buyerTotal = itemPrice + shippingCost

  // Platform fee is based on item price only
  const platformFee = Number((itemPrice * 0.035).toFixed(2))

  // Seller payout ignores shipping (buyer covers it)
  const sellerPayout = Number(
    (itemPrice - platformFee).toFixed(2)
  )

  const canRespond =
    offer.status !== "accepted" &&
    offer.counter_count < 6 &&
    offer.last_actor === "buyer"

  /* ---------------- ACTIONS ---------------- */

  const acceptOffer = async () => {
    const { error } = await supabase
      .from("offers")
      .update({ status: "accepted" })
      .eq("id", offer.id)

    if (error) {
      Alert.alert("Error", "Failed to accept offer.")
      return
    }

    Alert.alert(
      "Offer Accepted",
      "The buyer has been notified and can now complete payment."
    )

    router.replace("../seller-hub/offers")
  }

  const declineOffer = async () => {
    const { error } = await supabase
      .from("offers")
      .update({ status: "declined" })
      .eq("id", offer.id)

    if (error) {
      Alert.alert("Error", "Failed to decline offer.")
      return
    }

    router.replace("../seller-hub/offers")
  }

  const submitCounter = async () => {
    const amount = Number(counterAmount)
    if (!amount || amount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid counter offer.")
      return
    }

    const { error } = await supabase
      .from("offers")
      .update({
        current_amount: amount,
        counter_count: offer.counter_count + 1,
        last_actor: "seller",
        status: "countered",
      })
      .eq("id", offer.id)

    if (error) {
      Alert.alert("Error", "Failed to counter offer.")
      return
    }

    setShowCounter(false)
    router.replace("../seller-hub/offers")
  }

  /* ---------------- UI ---------------- */

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 80 }} />
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
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

          {/* RECEIPT */}
          <View style={styles.receipt}>
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
              label="Melo Fee (3.5%)"
              value={`- $${platformFee.toFixed(2)}`}
            />

            <View style={styles.divider} />

            <Row
              label="You receive"
              value={`$${sellerPayout.toFixed(2)}`}
              bold
            />

            <View style={styles.divider} />

            <Row
              label="Buyer pays"
              value={`$${buyerTotal.toFixed(2)}`}
            />
          </View>

          <Text style={styles.meta}>
            Counters used: {offer.counter_count} / 6
          </Text>
        </View>
      </View>

      {/* ACTIONS */}
      {canRespond && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={acceptOffer}
          >
            <Text style={styles.acceptText}>Accept Offer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setShowCounter(true)}
          >
            <Text style={styles.counterText}>Counter</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineBtn}
            onPress={declineOffer}
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
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={submitCounter}
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

  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
  },

  content: { padding: 16 },

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
    color: "#0F1E17",
    marginBottom: 12,
  },

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

  divider: {
    height: 1,
    backgroundColor: "#CFE5DA",
    marginVertical: 8,
  },

  meta: {
    marginTop: 10,
    fontSize: 12,
    color: "#6B8F7D",
  },

  actionBar: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 16,
    gap: 10,
  },

  acceptBtn: {
    backgroundColor: "#1F7A63",
    paddingVertical: 14,
    borderRadius: 16,
  },

  acceptText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#fff",
  },

  counterBtn: {
    backgroundColor: "#E8F5EE",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F7A63",
  },

  counterText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#1F7A63",
  },

  declineBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EB5757",
  },

  declineText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#EB5757",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },

  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },

  input: {
    backgroundColor: "#F4F4F4",
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
  },

  modalActions: {
    flexDirection: "row",
    marginTop: 20,
    gap: 10,
  },

  modalCancel: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#E4EFEA",
    alignItems: "center",
  },

  modalCancelText: {
    fontWeight: "700",
    color: "#2E5F4F",
  },

  modalConfirm: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#1F7A63",
    alignItems: "center",
  },

  modalConfirmText: {
    fontWeight: "900",
    color: "#fff",
  },
})
