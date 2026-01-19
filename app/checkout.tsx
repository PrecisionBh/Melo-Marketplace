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


import { supabase } from "../lib/supabase"

type Listing = {
  id: string
  title: string
  description?: string | null
  price: number
  image_urls: string[] | null
  shipping_type: "free" | "buyer_pays"
  shipping_price: number | null
}

export default function CheckoutScreen() {
  const router = useRouter()
  const { listingId } = useLocalSearchParams<{ listingId: string }>()

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    if (listingId) loadListing()
  }, [listingId])

  const loadListing = async () => {
    const { data } = await supabase
      .from("listings")
      .select(
        "id,title,description,price,image_urls,shipping_type,shipping_price"
      )
      .eq("id", listingId)
      .single()

    if (data) setListing(data)
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

  const shipping =
    listing.shipping_type === "free"
      ? 0
      : listing.shipping_price ?? 0

  const buyerProtectionFee = listing.price * 0.03
  const total = listing.price + shipping + buyerProtectionFee

  /* ---------------- QUICK BUY ---------------- */

  const quickBuy = async () => {
    setPaying(true)

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-payment-intent",
        {
          body: {
            listing_id: listing.id,
            amount: Math.round(total * 100),
          },
        }
      )

      if (error) throw error

      Alert.alert(
        "Payment successful",
        "Your order has been placed."
      )

      router.replace("/buyers-hub/orders/in-progress")
    } catch (err: any) {
      Alert.alert(
        "Payment failed",
        "Unable to use default payment method."
      )
    } finally {
      setPaying(false)
    }
  }

  /* ---------------- PAY WITH ANOTHER CARD ---------------- */

  const payWithAnotherCard = async () => {
    setPaying(true)

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            listing_id: listing.id,
            amount: Math.round(total * 100),
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
        err?.message || "Unable to open Stripe checkout."
      )
    } finally {
      setPaying(false)
    }
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* IMAGE CAROUSEL */}
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

        {/* ITEM INFO */}
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
            label="Buyer protection (3%)"
            value={`$${buyerProtectionFee.toFixed(2)}`}
          />

          <View style={styles.divider} />

          <Row label="Total" value={`$${total.toFixed(2)}`} bold />
        </View>

        {/* BUTTONS */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={quickBuy}
          disabled={paying}
        >
          <Text style={styles.primaryText}>
            Quick Buy • ${total.toFixed(2)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={payWithAnotherCard}
          disabled={paying}
        >
          <Text style={styles.secondaryText}>
            Pay with another card
          </Text>
        </TouchableOpacity>

        <Text style={styles.reassurance}>
          Secure checkout powered by Stripe
        </Text>

        <View style={styles.trustBox}>
          <Ionicons name="shield-checkmark" size={18} color="#2E5F4F" />
          <Text style={styles.trustText}>
            Buyer protection includes escrow, fraud prevention, and delivery
            confirmation. Funds are only released once your item arrives as
            described.
          </Text>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>
    </View>
  )
}

/* ---------- HELPERS ---------- */

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

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  topBar: {
    paddingTop: 50,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    alignSelf: "center",
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
    gap: 8,
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
    lineHeight: 18,
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
    marginBottom: 10,
  },

  primaryText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },

  secondaryBtn: {
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "#0F1E17",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  secondaryText: {
    color: "#0F1E17",
    fontWeight: "800",
    fontSize: 14,
  },

  reassurance: {
    fontSize: 12,
    textAlign: "center",
    color: "#6B8F7D",
    fontWeight: "600",
    marginBottom: 12,
  },

  trustBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#DFF0E8",
  },

  trustText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#2E5F4F",
  },
})
