import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabase"

/* ---------------- TYPES ---------------- */

type CheckoutItem = {
  id: string
  title: string
  price: number
  image_url: string | null
  shipping_type: "free" | "buyer_pays"
  shipping_price: number
  seller_id: string
}

type OfferWithListing = {
  id: string
  current_amount: number
  seller_id: string
  listing: {
    title: string
    image_urls: string[] | null
    shipping_type: "seller_pays" | "buyer_pays"
    shipping_price: number | null
  } | null
}

/* ---------------- SCREEN ---------------- */

export default function CheckoutScreen() {
  const router = useRouter()
  const { listingId, offerId } = useLocalSearchParams<{
    listingId?: string
    offerId?: string
  }>()
  const { session } = useAuth()

  const [item, setItem] = useState<CheckoutItem | null>(null)
  const [loading, setLoading] = useState(true)

  /* ---------------- LOAD DATA ---------------- */

  useEffect(() => {
    if (offerId) loadFromOffer()
    else if (listingId) loadFromListing()
    else setLoading(false)
  }, [offerId, listingId])

  const loadFromOffer = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("offers")
      .select(`
        id,
        current_amount,
        seller_id,
        listing:listings!offers_listing_id_fkey (
          title,
          image_urls,
          shipping_type,
          shipping_price
        )
      `)
      .eq("id", offerId)
      .single<OfferWithListing>()

    if (error || !data || !data.listing) {
      Alert.alert("Error", "Offer not found.")
      setLoading(false)
      return
    }

    setItem({
      id: data.id,
      title: data.listing.title,
      price: Number(data.current_amount),
      image_url: data.listing.image_urls?.[0] ?? null,
      shipping_type:
        data.listing.shipping_type === "seller_pays"
          ? "free"
          : "buyer_pays",
      shipping_price: Number(data.listing.shipping_price ?? 0),
      seller_id: data.seller_id,
    })

    setLoading(false)
  }

  const loadFromListing = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("listings")
      .select(
        "id,title,price,image_urls,shipping_type,shipping_price,user_id"
      )
      .eq("id", listingId)
      .single()

    if (error || !data) {
      Alert.alert("Error", "Listing not found.")
      setLoading(false)
      return
    }

    setItem({
      id: data.id,
      title: data.title,
      price: Number(data.price),
      image_url: data.image_urls?.[0] ?? null,
      shipping_type:
        data.shipping_type === "seller_pays"
          ? "free"
          : "buyer_pays",
      shipping_price: Number(data.shipping_price ?? 0),
      seller_id: data.user_id,
    })

    setLoading(false)
  }

  /* ---------------- RENDER ---------------- */

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <Text>Checkout item not found.</Text>
      </View>
    )
  }

  /* ---------------- CORRECT MATH (UPDATED WITH 7.5% TAX) ---------------- */

  const shipping =
    item.shipping_type === "free" ? 0 : item.shipping_price

  // Seller escrow base (item + shipping)
  const escrow = item.price + shipping

  // Buyer fee (still ONLY based on escrow, not tax)
  const buyerFee = +(
    escrow * 0.03 + 0.3
  ).toFixed(2)

  // Florida sales tax (7.5%) on item + shipping ONLY
  const taxRate = 0.075
  const tax = +(escrow * taxRate).toFixed(2)

  // Final total buyer pays
  const total = +(
    escrow + buyerFee + tax
  ).toFixed(2)

  const totalCents = Math.round(total * 100)

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.image} />
        )}

        <View style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
        </View>

        <View style={styles.summary}>
          <Row label="Item price" value={`$${item.price.toFixed(2)}`} />
          <Row
            label="Shipping"
            value={shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
          />
          <Row
            label="Buyer protection & processing"
            value={`$${buyerFee.toFixed(2)}`}
          />
          <Row
            label="Sales tax (7.5%)"
            value={`$${tax.toFixed(2)}`}
          />
          <View style={styles.divider} />
          <Row label="Total" value={`$${total.toFixed(2)}`} bold />
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            router.push({
              pathname: "/checkout/final",
              params: {
                listingId,
                offerId,
                totalCents: String(totalCents),
              },
            })
          }
        >
          <Text style={styles.primaryText}>
            Proceed to Checkout • ${total.toFixed(2)}
          </Text>
        </TouchableOpacity>

        <Text style={styles.reassurance}>
          Secure checkout powered by Stripe
        </Text>

        <View style={styles.protectionPill}>
          <Ionicons name="shield-checkmark" size={14} color="#1F7A63" />
          <Text style={styles.protectionText}>
            Buyer Protection Included
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
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
      <Text style={[styles.rowLabel, bold && styles.boldText]}>
        {label}
      </Text>
      <Text style={[styles.rowValue, bold && styles.boldText]}>
        {value}
      </Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#7FAF9B",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  content: {
    padding: 20,
  },

  image: {
    width: "100%",
    height: 220,
    resizeMode: "contain",
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
  },

  price: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "900",
    color: "#2E5F4F",
  },

  summary: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },

  rowLabel: { color: "#6B8F7D", fontWeight: "600" },
  rowValue: { color: "#0F1E17", fontWeight: "700" },
  boldText: { fontWeight: "900" },

  divider: {
    height: 1,
    backgroundColor: "#D6E6DE",
    marginVertical: 8,
  },

  primaryBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: "#0F1E17",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },

  reassurance: {
    fontSize: 12,
    textAlign: "center",
    color: "#6B8F7D",
    fontWeight: "600",
    marginTop: 10,
  },

  protectionPill: {
    marginTop: 8,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  protectionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F7A63",
  },
})
