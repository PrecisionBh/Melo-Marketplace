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

import { useAuth } from "../../context/AuthContext"
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

/* ---------------- SCREEN ---------------- */

export default function FinalPaymentScreen() {
  const router = useRouter()
  const { listingId, offerId, totalCents } = useLocalSearchParams<{
    listingId?: string
    offerId?: string
    totalCents?: string
  }>()

  const { session } = useAuth()
  const total = Number(totalCents ?? 0) / 100

  const [paying, setPaying] = useState(false)
  const [useSaved, setUseSaved] = useState(true)
  const [saveAsDefault, setSaveAsDefault] = useState(false)

  /* ---------------- SHIPPING ---------------- */

  const [name, setName] = useState("")
  const [line1, setLine1] = useState("")
  const [line2, setLine2] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [postal, setPostal] = useState("")
  const [phone, setPhone] = useState("")

  /* ---------------- LOAD SAVED SHIPPING (ONCE) ---------------- */

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
      .then(({ data }) => {
        if (!data) return
        setName(data.display_name ?? "")
        setLine1(data.address_line1 ?? "")
        setLine2(data.address_line2 ?? "")
        setCity(data.city ?? "")
        setState(data.state ?? "")
        setPostal(data.postal_code ?? "")
      })
  }, [session?.user?.id])

  /* ---------------- PAY ---------------- */

  const payNow = async () => {
    if (!session?.user?.id || !session.user.email) {
      Alert.alert("Error", "You must be logged in.")
      return
    }

    if (!totalCents || Number(totalCents) <= 0) {
      Alert.alert("Error", "Invalid order total.")
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

      // 🔧 REQUIRED — persist item price source
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

        // 🔧 REQUIRED
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

        // 🔧 REQUIRED
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

      // 🔧 REQUIRED — derive shipping + buyer fee
      const shippingCents =
        listingSnapshot.shipping_type === "buyer_pays"
          ? Math.round((listingSnapshot.shipping_price ?? 0) * 100)
          : 0

      const buyerFeeCents = Math.round(itemPriceCents * 0.015)

      // 🔧 REQUIRED — true escrow base
      const escrowCents = itemPriceCents + shippingCents

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

          // 🔧 REQUIRED — Stripe total
          amount_cents: Number(totalCents),
          currency: "usd",

          // 🔧 REQUIRED — pricing breakdown
          item_price_cents: itemPriceCents,
          shipping_amount_cents: shippingCents,
          buyer_fee_cents: buyerFeeCents,

          // 🔧 REQUIRED — escrow ≠ Stripe total
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

      if (!order) throw error

      /* ---------- SAVE AS DEFAULT (OPT-IN) ---------- */
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
            amount: Number(totalCents),
            email: session.user.email,
          },
        })

      if (stripeErr || !data?.url) {
        throw stripeErr
      }

      await Linking.openURL(data.url)
    } catch (err: any) {
      Alert.alert("Payment error", err?.message ?? "Checkout failed")
    } finally {
      setPaying(false)
    }
  }

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipping</Text>
        <View style={{ width: 22 }} />
      </View>

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
            <Text style={styles.toggleText}>
              Use default shipping address
            </Text>
          </View>

          {!useSaved && (
            <View style={styles.toggleRow}>
              <TouchableOpacity
                onPress={() => setSaveAsDefault(!saveAsDefault)}
              >
                <Ionicons
                  name={saveAsDefault ? "checkbox" : "square-outline"}
                  size={18}
                  color="#1F7A63"
                />
              </TouchableOpacity>
              <Text style={styles.toggleText}>
                Save as default shipping address
              </Text>
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
      </ScrollView>
    </View>
  )
}
/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },
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
