import { Ionicons } from "@expo/vector-icons"
import * as Linking from "expo-linking"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "../../context/AuthContext"
import { handleAppError } from "../../lib/errors/appError"
import { supabase } from "../../lib/supabase"



/* ---------------- TYPES ---------------- */

type ListingSnapshot = {
  id: string
  title: string
  image_url: string | null
  shipping_type: "seller_pays" | "buyer_pays"
  shipping_price: number | null
  seller_id: string
}

type OfferWithListing = {
  id: string
  current_amount: number
  seller_id: string
  listing: {
    id: string
    title: string
    image_urls: string[] | null
    shipping_type: "seller_pays" | "buyer_pays"
    shipping_price: number | null
    user_id: string
  }
}

type OfferForTotal = {
  current_amount: number
  listing: {
    shipping_type: "seller_pays" | "buyer_pays"
    shipping_price: number | null
  } | null
}

type ListingForTotal = {
  price: number
  shipping_type: "seller_pays" | "buyer_pays"
  shipping_price: number | null
}

/* ---------------- SCREEN ---------------- */

export default function FinalPaymentScreen() {
  const router = useRouter()
  const { listingId, offerId } = useLocalSearchParams<{
    listingId?: string
    offerId?: string
  }>()

  const { session } = useAuth()

  const [paying, setPaying] = useState(false)
  const [useSaved, setUseSaved] = useState(true)
  const [saveAsDefault, setSaveAsDefault] = useState(false)

  /* ---------------- TOTAL DISPLAY ---------------- */

  const [displayTotalCents, setDisplayTotalCents] =
    useState<number | null>(null)

  /* ---------------- SHIPPING ---------------- */

  const [name, setName] = useState("")
  const [line1, setLine1] = useState("")
  const [line2, setLine2] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [postal, setPostal] = useState("")
  const [phone, setPhone] = useState("")

  /* ---------------- LOAD SAVED SHIPPING ---------------- */

  useEffect(() => {
    if (!session?.user?.id) return

    supabase
  .from("profiles")
  .select(`
    display_name,
    address_line1,
    address_line2,
    city,
    state,
    postal_code
  `)
  .eq("id", session.user.id)
  .single()
  .then(({ data, error }) => {
    if (error) {
      handleAppError(error, {
        fallbackMessage: "Failed to load saved shipping address.",
      })
      return
    }

    if (!data) return
    setName(data.display_name ?? "")
    setLine1(data.address_line1 ?? "")
    setLine2(data.address_line2 ?? "")
    setCity(data.city ?? "")
    setState(data.state ?? "")
    setPostal(data.postal_code ?? "")
  })

  }, [session?.user?.id])

  /* ---------------- CALCULATE DISPLAY TOTAL ---------------- */

  useEffect(() => {
    const loadTotal = async () => {
      if (!listingId && !offerId) return

      let itemCents = 0
      let shippingCents = 0

      try {
        if (offerId) {
          const { data, error } = await supabase
            .from("offers")
            .select(
              `
              current_amount,
              listing: listings (shipping_type, shipping_price)
            `
            )
            .eq("id", offerId)
            .single<OfferForTotal>()

          if (error || !data) return

          itemCents = Math.round(Number(data.current_amount) * 100)

          const listing = data.listing
          if (listing?.shipping_type === "buyer_pays") {
            shippingCents = Math.round((listing.shipping_price ?? 0) * 100)
          }
        } else if (listingId) {
          const { data, error } = await supabase
            .from("listings")
            .select(`price, shipping_type, shipping_price`)
            .eq("id", listingId)
            .single<ListingForTotal>()

          if (error || !data) return

          itemCents = Math.round(Number(data.price) * 100)

          if (data.shipping_type === "buyer_pays") {
            shippingCents = Math.round((data.shipping_price ?? 0) * 100)
          }
        }

        const escrow = itemCents + shippingCents

// Florida sales tax (7.5%) on item + shipping ONLY
const taxRate = 0.075
const taxCents = Math.round(escrow * taxRate)

// Buyer fee (DO NOT charge fee on tax)
const buyerFee = Math.round(escrow * 0.03) + 30

// Final display total must match Stripe total
setDisplayTotalCents(escrow + buyerFee + taxCents)
      } catch (err) {
  handleAppError(err, {
    fallbackMessage: "Failed to calculate checkout total.",
  })
  setDisplayTotalCents(null)
}

    }

    loadTotal()
  }, [listingId, offerId])

  /* ---------------- PAY ---------------- */

  const payNow = async () => {
    if (!session?.user?.id || !session.user.email) {
      Alert.alert("Error", "You must be logged in.")
      return
    }

    if (!displayTotalCents || displayTotalCents <= 0) {
      Alert.alert("Error", "Unable to calculate order total.")
      return
    }

    if (
      (!useSaved &&
        (!name || !line1 || !city || !state || !postal || !phone)) ||
      (useSaved &&
        (!name || !line1 || !city || !state || !postal))
    ) {
      Alert.alert("Missing info", "Please complete shipping address.")
      return
    }

    setPaying(true)

    try {
      let sellerId: string | null = null
      let imageUrl: string | null = null
      let listingSnapshot: ListingSnapshot | null = null
      let itemPriceCents: number | null = null

      /* ---------- OFFER FLOW ---------- */
      if (offerId) {
        const { data, error } = await supabase
          .from("offers")
          .select(`
            id,
            current_amount,
            seller_id,
            listing: listings (
              id,
              title,
              image_urls,
              shipping_type,
              shipping_price,
              user_id
            )
          `)
          .eq("id", offerId)
          .single<OfferWithListing>()

        if (error || !data || !data.listing) {
          throw new Error("Offer not found")
        }

        sellerId = data.seller_id
        imageUrl = data.listing.image_urls?.[0] ?? null
        itemPriceCents = Math.round(Number(data.current_amount) * 100)

        listingSnapshot = {
          id: data.listing.id,
          title: data.listing.title,
          image_url: imageUrl,
          shipping_type: data.listing.shipping_type,
          shipping_price: data.listing.shipping_price,
          seller_id: data.listing.user_id,
        }
      }

      /* ---------- LISTING FLOW ---------- */
      if (!offerId && listingId) {
        const { data, error } = await supabase
          .from("listings")
          .select(`
            id,
            title,
            price,
            image_urls,
            shipping_type,
            shipping_price,
            user_id
          `)
          .eq("id", listingId)
          .single()

        if (error || !data) {
          throw new Error("Listing not found")
        }

        sellerId = data.user_id
        imageUrl = data.image_urls?.[0] ?? null
        itemPriceCents = Math.round(Number(data.price) * 100)

        listingSnapshot = {
          id: data.id,
          title: data.title,
          image_url: imageUrl,
          shipping_type: data.shipping_type,
          shipping_price: data.shipping_price,
          seller_id: data.user_id,
        }
      }

      if (!sellerId || !listingSnapshot || itemPriceCents === null) {
        throw new Error("Missing listing pricing data")
      }

            /* ---------- HARD SOLD GUARD (ANTI DOUBLE PURCHASE) ---------- */

      const { data: latestListing, error: soldCheckError } = await supabase
        .from("listings")
        .select("id, is_sold")
        .eq("id", listingSnapshot.id)
        .single()

      if (soldCheckError) {
        throw new Error("Failed to verify listing availability")
      }

      if (latestListing?.is_sold) {
        Alert.alert(
          "Item Sold",
          "This item has already been sold and is no longer available."
        )
        setPaying(false)
        return
      }


      // 🚫 BLOCK BUYING YOUR OWN LISTING (CRITICAL MARKETPLACE GUARD)
if (sellerId === session.user.id) {
  Alert.alert(
    "Invalid Purchase",
    "You cannot buy your own listing."
  )
  setPaying(false)
  return
}


      /* ---------- PRICING (SINGLE SOURCE OF TRUTH) ---------- */

      const shippingCents =
  listingSnapshot.shipping_type === "buyer_pays"
    ? Math.round((listingSnapshot.shipping_price ?? 0) * 100)
    : 0

// Seller escrow (DO NOT include tax here)
const escrowCents = itemPriceCents + shippingCents

// Florida sales tax (7.5%) applied to item + shipping only
const taxRate = 0.075
const taxCents = Math.round(escrowCents * taxRate)

// Platform buyer fee (DO NOT charge fee on tax)
const buyerFeeCents = Math.round(escrowCents * 0.03) + 30

// Final amount charged to the buyer via Stripe
const stripeTotalCents = escrowCents + buyerFeeCents + taxCents

      /* ---------- CREATE ORDER ---------- */

      const { data: order, error } = await supabase
  .from("orders")
  .insert({
    buyer_id: session.user.id,
    seller_id: sellerId,

    listing_id: listingId ?? listingSnapshot.id,
    offer_id: offerId ?? null,

    listing_snapshot: listingSnapshot,

    status: "pending_payment",

    amount_cents: stripeTotalCents,
    currency: "usd",

    // 🔒 CORE SNAPSHOT FIELDS
    item_price_cents: itemPriceCents,
    shipping_amount_cents: shippingCents,
    tax_cents: taxCents, // ✅ THIS is why it was missing
    buyer_fee_cents: buyerFeeCents,
    escrow_amount_cents: escrowCents,

    shipping_name: name,
    shipping_line1: line1,
    shipping_line2: line2,
    shipping_city: city,
    shipping_state: state,
    shipping_postal_code: postal,
    shipping_country: "US",
    shipping_phone: phone,

    image_url: imageUrl,
  })
  .select()
  .single()


      if (error || !order) {
  throw new Error("Failed to create order.")
}


      /* ---------- SAVE DEFAULT SHIPPING ---------- */
      if (!useSaved && saveAsDefault) {
        await supabase
          .from("profiles")
          .update({
            display_name: name,
            address_line1: line1,
            address_line2: line2,
            city,
            state,
            postal_code: postal,
            country: "United States",
          })
          .eq("id", session.user.id)
      }

      /* ---------- STRIPE ---------- */

      const { data, error: stripeErr } =
        await supabase.functions.invoke("create-checkout-session", {
          body: {
            order_id: order.id,
            amount: stripeTotalCents,
            email: session.user.email,
          },
        })

      if (stripeErr) {
  throw stripeErr
}

if (!data?.url) {
  throw new Error("Stripe session failed to return a checkout URL.")
}


      await Linking.openURL(data.url)
    } catch (err: any) {
  handleAppError(err, {
    fallbackMessage:
      err?.message ?? "Checkout failed. Please try again.",
  })
} finally {
  setPaying(false)
}

  }

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.screen}>
      <AppHeader
  title="Shipping"
  backRoute={{
    pathname: "/checkout",
    params: { listingId, offerId },
  }}
/>



      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => {
                if (useSaved) {
                  setName("")
                  setLine1("")
                  setLine2("")
                  setCity("")
                  setState("")
                  setPostal("")
                  setPhone("")
                  setSaveAsDefault(false)
                }
                setUseSaved(!useSaved)
              }}
            >
              <Ionicons
                name={useSaved ? "checkbox" : "square-outline"}
                size={18}
                color="#1F7A63"
              />
            </TouchableOpacity>
            <Text style={styles.toggleText}>Use default shipping address</Text>
          </View>

          {!useSaved && (
            <View style={styles.toggleRow}>
              <TouchableOpacity onPress={() => setSaveAsDefault(!saveAsDefault)}>
                <Ionicons
                  name={saveAsDefault ? "checkbox" : "square-outline"}
                  size={18}
                  color="#1F7A63"
                />
              </TouchableOpacity>
              <Text style={styles.toggleText}>Save as default shipping address</Text>
            </View>
          )}

          <TextInput
            style={[styles.input, useSaved && styles.disabled]}
            editable={!useSaved}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half, useSaved && styles.disabled]}
              editable={!useSaved}
              placeholder="Address"
              value={line1}
              onChangeText={setLine1}
            />
            <TextInput
              style={[styles.input, styles.half, useSaved && styles.disabled]}
              editable={!useSaved}
              placeholder="Apt / Unit"
              value={line2}
              onChangeText={setLine2}
            />
          </View>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half, useSaved && styles.disabled]}
              editable={!useSaved}
              placeholder="City"
              value={city}
              onChangeText={setCity}
            />
            <TextInput
              style={[styles.input, styles.half, useSaved && styles.disabled]}
              editable={!useSaved}
              placeholder="State"
              value={state}
              onChangeText={setState}
            />
          </View>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half, useSaved && styles.disabled]}
              editable={!useSaved}
              placeholder="Postal Code"
              value={postal}
              onChangeText={setPostal}
            />
            <TextInput
              style={[styles.input, styles.half, useSaved && styles.disabled]}
              editable={!useSaved}
              placeholder="Phone"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={payNow} disabled={paying}>
          <Text style={styles.primaryText}>
            {paying
              ? "Processing..."
              : displayTotalCents
              ? `Pay Now • $${(displayTotalCents / 100).toFixed(2)}`
              : "Pay Now"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.reassurance}>Secure checkout powered by Stripe</Text>
      </ScrollView>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

  content: { padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2E5F4F",
  },
  row: { flexDirection: "row", gap: 8 },
  input: {
    height: 46,
    borderRadius: 10,
    backgroundColor: "#F4FAF7",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D6E6DE",
    marginBottom: 10,
    fontSize: 14,
  },
  half: { flex: 1 },
  disabled: { opacity: 0.6 },
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
})
