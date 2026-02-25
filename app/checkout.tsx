import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "../context/AuthContext"
import { handleAppError } from "../lib/errors/appError"
import { supabase } from "../lib/supabase"

/* ---------------- TYPES (MINIMAL CHANGE = FEWER ERRORS) ---------------- */

type CheckoutItem = {
  id: string
  title: string
  price: number
  image_url: string | null
  shipping_type: "free" | "buyer_pays"
  shipping_price: number
  seller_id: string
  quantity_available?: number | null
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

  // 🔥 SAFE quantity state (does NOT depend on router params)
  const [quantity, setQuantity] = useState(1)

  /* ---------------- BACK ROUTE (SAME LOGIC AS MAKE OFFER) ---------------- */

  const backRoute =
    offerId
      ? ("/buyer-hub/offers" as const)
      : listingId
      ? ({ pathname: "/listing/[id]", params: { id: listingId } } as any)
      : ("/" as const)

  /* ---------------- LOAD DATA ---------------- */

  useEffect(() => {
    if (!session?.user) {
      handleAppError(new Error("Missing session"), {
        context: "checkout_no_session",
        silent: true,
      })
      setLoading(false)
      return
    }

    if (offerId) loadFromOffer()
    else if (listingId) loadFromListing()
    else setLoading(false)
  }, [offerId, listingId, session])

  const loadFromOffer = async () => {
    try {
      setLoading(true)

      if (!offerId) throw new Error("Missing offerId")

      // NOTE: keep this loosely typed to avoid TS cascade in strict mode
      const { data, error } = await supabase
        .from("offers")
        .select(
          `
          id,
          current_amount,
          seller_id,
          listing:listings (
            title,
            image_urls,
            shipping_type,
            shipping_price,
            quantity_available
          )
        `
        )
        .eq("id", offerId)
        .single()

      if (error) throw error
      if (!data || !(data as any).listing) throw new Error("Offer or listing not found")

      const offerData: any = data
      const listing: any = offerData.listing

      setItem({
        id: String(offerData.id),
        title: String(listing.title ?? ""),
        price: Number(offerData.current_amount ?? 0), // per-item
        image_url: listing.image_urls?.[0] ?? null,
        shipping_type: listing.shipping_type === "seller_pays" ? "free" : "buyer_pays",
        shipping_price: Number(listing.shipping_price ?? 0),
        seller_id: String(offerData.seller_id),
        quantity_available:
          typeof listing.quantity_available === "number" ? listing.quantity_available : 1,
      })
    } catch (err) {
      handleAppError(err, {
        context: "checkout_load_offer",
        fallbackMessage: "Failed to load checkout data.",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadFromListing = async () => {
    try {
      setLoading(true)

      if (!listingId) throw new Error("Missing listingId")

      const { data, error } = await supabase
        .from("listings")
        .select(
          "id,title,price,image_urls,shipping_type,shipping_price,user_id,quantity_available"
        )
        .eq("id", listingId)
        .single()

      if (error) throw error
      if (!data) throw new Error("Listing not found")

      const listing: any = data

      setItem({
        id: String(listing.id),
        title: String(listing.title ?? ""),
        price: Number(listing.price ?? 0),
        image_url: listing.image_urls?.[0] ?? null,
        shipping_type: listing.shipping_type === "seller_pays" ? "free" : "buyer_pays",
        shipping_price: Number(listing.shipping_price ?? 0),
        seller_id: String(listing.user_id),
        quantity_available:
          typeof listing.quantity_available === "number" ? listing.quantity_available : 1,
      })
    } catch (err) {
      handleAppError(err, {
        context: "checkout_load_listing",
        fallbackMessage: "Failed to load listing.",
      })
    } finally {
      setLoading(false)
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

  /* ---------------- MULTI-QUANTITY SAFE MATH ---------------- */

  const effectiveQuantity = Math.max(1, quantity)

  const shippingPerItem = item.shipping_type === "free" ? 0 : Number(item.shipping_price ?? 0)
  const shipping = shippingPerItem * effectiveQuantity

  const itemsTotal = item.price * effectiveQuantity
  const escrow = itemsTotal + shipping

  const buyerFee = +(escrow * 0.03 + 0.3).toFixed(2)
  const tax = +(escrow * 0.075).toFixed(2)
  const total = +(escrow + buyerFee + tax).toFixed(2)

  const totalCents = Math.round(total * 100)

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      <AppHeader title="Checkout" backRoute={backRoute} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {item.image_url && <Image source={{ uri: item.image_url }} style={styles.image} />}

        <View style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.price}>${item.price.toFixed(2)} each</Text>

          {/* 🔥 ONLY show quantity if > 1 (same as Make Offer) */}
          {typeof item.quantity_available === "number" && item.quantity_available > 1 && (
            <>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "800",
                  color: "#2E5F4F",
                  marginTop: 6,
                }}
              >
                {item.quantity_available} available
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 10,
                }}
              >
                <TouchableOpacity
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: "#E8F5EE",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F1E17" }}>-</Text>
                </TouchableOpacity>

                <Text
                  style={{
                    marginHorizontal: 18,
                    fontSize: 18,
                    fontWeight: "900",
                    color: "#0F1E17",
                  }}
                >
                  {effectiveQuantity}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    setQuantity((q) => Math.min(item.quantity_available ?? 1, q + 1))
                  }
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: "#E8F5EE",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F1E17" }}>+</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={styles.summary}>
          <Row
            label={
              effectiveQuantity > 1
                ? `Items (${effectiveQuantity} × $${item.price.toFixed(2)})`
                : "Item price"
            }
            value={`$${itemsTotal.toFixed(2)}`}
          />

          <Row
            label={effectiveQuantity > 1 ? `Shipping (${effectiveQuantity} items)` : "Shipping"}
            value={shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
          />

          <Row
            label="Buyer protection & processing"
            value={`$${buyerFee.toFixed(2)}`}
          />

          <Row label="Sales tax (7.5%)" value={`$${tax.toFixed(2)}`} />

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
                quantity: String(effectiveQuantity), // ✅ pass quantity forward
                totalCents: String(totalCents),
              },
            })
          }
        >
          <Text style={styles.primaryText}>Proceed to Checkout • ${total.toFixed(2)}</Text>
        </TouchableOpacity>

        <Text style={styles.reassurance}>Secure checkout powered by Stripe</Text>

        <View style={styles.protectionPill}>
          <Ionicons name="shield-checkmark" size={14} color="#1F7A63" />
          <Text style={styles.protectionText}>Buyer Protection Included</Text>
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
      <Text style={[styles.rowLabel, bold && styles.boldText]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.boldText]}>{value}</Text>
    </View>
  )
}

/* ---------------- STYLES (UNCHANGED) ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  content: { padding: 20 },

  image: { width: "100%", height: 220, resizeMode: "contain", marginBottom: 12 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },

  title: { fontSize: 16, fontWeight: "800", color: "#0F1E17" },

  price: { marginTop: 6, fontSize: 18, fontWeight: "900", color: "#2E5F4F" },

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

  primaryText: { color: "#fff", fontWeight: "900", fontSize: 14 },

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

  protectionText: { fontSize: 12, fontWeight: "800", color: "#1F7A63" },
})