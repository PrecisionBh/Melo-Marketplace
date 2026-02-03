import { Ionicons } from "@expo/vector-icons"
import * as Linking from "expo-linking"
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
  const [paying, setPaying] = useState(false)

  /* ---------------- LOAD DATA ---------------- */

  useEffect(() => {
    if (offerId) {
      loadFromOffer()
    } else if (listingId) {
      loadFromListing()
    } else {
      setLoading(false)
    }
  }, [offerId, listingId])

  /* ---------------- OFFER CHECKOUT ---------------- */

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

  /* ---------------- LISTING CHECKOUT ---------------- */

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

  /* ---------------- PAY NOW ---------------- */

  const payNow = async () => {
    if (!session?.user?.id || !session.user.email || !item) {
      Alert.alert("Error", "You must be logged in to continue.")
      return
    }

    setPaying(true)

    const shipping =
      item.shipping_type === "free" ? 0 : item.shipping_price

    const buyerProtectionFee = +(item.price * 0.029 + 0.3).toFixed(2)
    const total = +(item.price + shipping + buyerProtectionFee).toFixed(2)

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            listing_id: listingId ?? null,
            offer_id: offerId ?? null,
            amount: Math.round(total * 100),
            email: session.user.email,
            buyer_id: session.user.id,
            seller_id: item.seller_id,
            image_url: item.image_url,
          },
        }
      )

      if (error || !data?.url) {
        throw error || new Error("No checkout URL returned")
      }

      await Linking.openURL(data.url)
    } catch (err: any) {
      Alert.alert(
        "Checkout error",
        err?.message || "Unable to start checkout."
      )
    } finally {
      setPaying(false)
    }
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

  const shipping =
    item.shipping_type === "free" ? 0 : item.shipping_price

  const buyerProtectionFee = +(item.price * 0.029 + 0.3).toFixed(2)
  const total = +(item.price + shipping + buyerProtectionFee).toFixed(2)

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
            value={`$${buyerProtectionFee.toFixed(2)}`}
          />
          <View style={styles.divider} />
          <Row label="Total" value={`$${total.toFixed(2)}`} bold />
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={payNow}
          disabled={paying}
        >
          <Text style={styles.primaryText}>
            Pay Now • ${total.toFixed(2)}
          </Text>
        </TouchableOpacity>

        <Text style={styles.reassurance}>
          Secure checkout powered by Stripe
        </Text>

        {/* 🔐 BUYER PROTECTION PILL */}
        <View style={styles.protectionPill}>
          <Ionicons
            name="shield-checkmark"
            size={16}
            color="#1F7A63"
          />
          <Text style={styles.protectionText}>
            Buyer Protection: Your payment is held securely until the item is
            shipped and received as described. If there’s an issue, we help
            resolve it.
          </Text>
        </View>
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
  content: { padding: 20 },
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

  /* 🔐 Buyer Protection Pill */
  protectionPill: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#CFE5DA",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  protectionText: {
    flex: 1,
    fontSize: 12,
    color: "#2E5F4F",
    fontWeight: "600",
    lineHeight: 16,
  },
})
