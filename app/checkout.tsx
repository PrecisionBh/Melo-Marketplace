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

type Listing = {
  id: string
  user_id: string
  title: string
  description?: string | null
  price: number
  image_urls: string[] | null
  shipping_type: "free" | "buyer_pays"
  shipping_price: number | null
}

/* ---------------- SCREEN ---------------- */

export default function CheckoutScreen() {
  const router = useRouter()
  const { listingId } = useLocalSearchParams<{ listingId: string }>()
  const { session } = useAuth()

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  /* ---------------- LOAD LISTING ---------------- */

  useEffect(() => {
    if (listingId) loadListing()
  }, [listingId])

  const loadListing = async () => {
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id,user_id,title,description,price,image_urls,shipping_type,shipping_price"
      )
      .eq("id", listingId)
      .single()

    if (error || !data) {
      Alert.alert("Error", "Listing not found.")
      setLoading(false)
      return
    }

    setListing(data)
    setLoading(false)
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Text>Listing not found.</Text>
      </View>
    )
  }

  const images = Array.isArray(listing.image_urls)
    ? listing.image_urls
    : []

  const mainImageUrl = images[0] ?? null

  const shipping =
    listing.shipping_type === "free"
      ? 0
      : listing.shipping_price ?? 0

  // ✅ Buyer protection fee (locked)
  const buyerProtectionFee = +(listing.price * 0.029 + 0.3).toFixed(2)
  const total = +(listing.price + shipping + buyerProtectionFee).toFixed(2)

  /* ---------------- PAY NOW ---------------- */

  const payNow = async () => {
    if (!session?.user?.id || !session.user.email) {
      Alert.alert("Error", "You must be logged in to continue.")
      return
    }

    setPaying(true)

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            listing_id: listing.id,
            amount: Math.round(total * 100),
            email: session.user.email,
            buyer_id: session.user.id,
            seller_id: listing.user_id,
            image_url: mainImageUrl,
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

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {images.length > 0 && (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageCarousel}
          >
            {images.map((uri, index) => (
              <View key={index} style={styles.imageWrap}>
                <Image source={{ uri }} style={styles.image} />
              </View>
            ))}
          </ScrollView>
        )}

        {/* ITEM CARD */}
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.itemTitle}>{listing.title}</Text>
            <Text style={styles.itemPrice}>
              ${listing.price.toFixed(2)}
            </Text>
          </View>

          {!!listing.description && (
            <Text style={styles.itemDescription}>
              {listing.description}
            </Text>
          )}
        </View>

        {/* SUMMARY */}
        <View style={styles.summary}>
          <Row label="Item price" value={`$${listing.price.toFixed(2)}`} />
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

        {/* PAY NOW */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={payNow}
          disabled={paying}
        >
          <Text style={styles.primaryText}>
            Pay Now • ${total.toFixed(2)}
          </Text>
        </TouchableOpacity>

        {/* STRIPE REASSURANCE */}
        <Text style={styles.reassurance}>
          Secure checkout powered by Stripe
        </Text>

        {/* 🟢 BUYER PROTECTION PILL */}
        <View style={styles.protectionPill}>
          <Ionicons name="shield-checkmark" size={18} color="#1F7A63" />
          <Text style={styles.protectionText}>
            Melo Buyer Protection — payments are held securely in escrow until
            delivery. Disputes supported if anything goes wrong.
          </Text>
        </View>

        {/* SAFE BOTTOM SPACE */}
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

  content: { paddingHorizontal: 20 },

  imageCarousel: { marginBottom: 12 },

  imageWrap: {
    width: 300,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },

  image: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  itemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F1E17",
  },

  itemPrice: {
    fontSize: 17,
    fontWeight: "900",
    color: "#2E5F4F",
  },

  itemDescription: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B8F7D",
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
    marginBottom: 6,
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
    marginBottom: 10,
  },

  protectionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#E8F5EE",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },

  protectionText: {
    flex: 1,
    fontSize: 12,
    color: "#1F7A63",
    fontWeight: "600",
    lineHeight: 16,
  },
})
