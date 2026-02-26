import * as Linking from "expo-linking"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import ShippingAddress from "@/components/checkout/shippingaddress"
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
  const { listingId, offerId, quantity } = useLocalSearchParams<{
    listingId?: string
    offerId?: string
    quantity?: string
  }>()

  const { session } = useAuth()

  // 🔥 CRITICAL: Safe quantity parsing (default = 1)
  const parsedQuantity = Math.max(1, Number(quantity ?? "1"))

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
  const [hasSavedAddress, setHasSavedAddress] = useState(false)

  /* ---------------- LOAD SAVED SHIPPING ---------------- */

  const loadSavedAddress = async () => {
  if (!session?.user?.id) return

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      shipping_name,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      shipping_phone
    `)
    .eq("id", session.user.id)
    .single()

  if (error) {
    handleAppError(error, {
      fallbackMessage: "Failed to load saved shipping address.",
    })
    return
  }

  if (!data) return

  // 🔒 STRICT SHIPPING COMPLETENESS CHECK
  const hasFullAddress =
    !!data.shipping_name?.trim() &&
    !!data.address_line1?.trim() &&
    !!data.city?.trim() &&
    !!data.state?.trim() &&
    !!data.postal_code?.trim()

  setHasSavedAddress(hasFullAddress)

  // 🔥 ALWAYS SHOW THE FORM (NEVER HIDE IT BASED ON DB STATE)
  if (hasFullAddress) {
    setName(data.shipping_name ?? "")
    setLine1(data.address_line1 ?? "")
    setLine2(data.address_line2 ?? "")
    setCity(data.city ?? "")
    setState(data.state ?? "")
    setPostal(data.postal_code ?? "")
    setPhone(data.shipping_phone ?? "")

    // Only default to saved mode if a valid saved address exists
    setUseSaved(true)
  } else {
    // 🚨 CRITICAL FIX:
    // DO NOT force toggle OFF
    // Just mark that no saved address exists and leave the form empty
    setName("")
    setLine1("")
    setLine2("")
    setCity("")
    setState("")
    setPostal("")
    setPhone("")
    // NO setUseSaved(false) here
  }
}

  useEffect(() => {
    if (!session?.user?.id) return
    loadSavedAddress()
  }, [session?.user?.id])

  /* ---------------- CALCULATE DISPLAY TOTAL (FIXED FOR QUANTITY) ---------------- */

  useEffect(() => {
    const loadTotal = async () => {
      if (!listingId && !offerId) return

      let itemCents = 0
      let shippingCents = 0

      try {
        if (offerId) {
          const { data, error } = await supabase
            .from("offers")
            .select(`
              current_amount,
              listing: listings (shipping_type, shipping_price)
            `)
            .eq("id", offerId)
            .single<OfferForTotal>()

          if (error || !data) return

          const unitPriceCents = Math.round(
            Number(data.current_amount) * 100
          )

          itemCents = unitPriceCents * parsedQuantity

          const listing = data.listing
          if (listing?.shipping_type === "buyer_pays") {
            const shippingPerItem = Math.round(
              (listing.shipping_price ?? 0) * 100
            )
            shippingCents = shippingPerItem * parsedQuantity
          }
        } else if (listingId) {
          const { data, error } = await supabase
            .from("listings")
            .select(`price, shipping_type, shipping_price`)
            .eq("id", listingId)
            .single<ListingForTotal>()

          if (error || !data) return

          const unitPriceCents = Math.round(Number(data.price) * 100)
          itemCents = unitPriceCents * parsedQuantity

          if (data.shipping_type === "buyer_pays") {
            const shippingPerItem = Math.round(
              (data.shipping_price ?? 0) * 100
            )
            shippingCents = shippingPerItem * parsedQuantity
          }
        }

        const escrow = itemCents + shippingCents
        const taxRate = 0.075
        const taxCents = Math.round(escrow * taxRate)
        const buyerFee = Math.round(escrow * 0.03) + 30

        setDisplayTotalCents(escrow + buyerFee + taxCents)
      } catch (err) {
        handleAppError(err, {
          fallbackMessage: "Failed to calculate checkout total.",
        })
        setDisplayTotalCents(null)
      }
    }

    loadTotal()
  }, [listingId, offerId, parsedQuantity])

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

    /* ---------------- HARDENED SHIPPING VALIDATION (MELO SAFE) ---------------- */

    // 🛡️ SINGLE SOURCE OF TRUTH — REQUIRED FIELDS (PHONE OPTIONAL)
    const isShippingComplete =
      name?.trim().length > 1 &&
      line1?.trim().length > 4 &&
      city?.trim().length > 1 &&
      state?.trim().length > 1 &&
      postal?.trim().length >= 5

    // 🔴 CRITICAL: HARD SHIPPING GUARD (CANNOT CREATE ORDER WITHOUT ADDRESS)
    if (!isShippingComplete) {
      Alert.alert(
        "Shipping Required",
        "Please complete your full shipping address before continuing to payment."
      )
      return
    }

    setPaying(true)

    try {
      let sellerId: string | null = null
      let imageUrl: string | null = null
      let listingSnapshot: ListingSnapshot | null = null
      let itemPriceCents: number | null = null

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

        const unitPriceCents = Math.round(
          Number(data.current_amount) * 100
        )
        itemPriceCents = unitPriceCents * parsedQuantity

        listingSnapshot = {
          id: data.listing.id,
          title: data.listing.title,
          image_url: imageUrl,
          shipping_type: data.listing.shipping_type,
          shipping_price: data.listing.shipping_price,
          seller_id: data.listing.user_id,
        }
      }

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

        const unitPriceCents = Math.round(Number(data.price) * 100)
        itemPriceCents = unitPriceCents * parsedQuantity

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

      const shippingPerItem =
        listingSnapshot.shipping_type === "buyer_pays"
          ? Math.round((listingSnapshot.shipping_price ?? 0) * 100)
          : 0

      const shippingCents = shippingPerItem * parsedQuantity
      const escrowCents = itemPriceCents + shippingCents
      const taxRate = 0.075
      const taxCents = Math.round(escrowCents * taxRate)
      const buyerFeeCents = Math.round(escrowCents * 0.03) + 30
      const stripeTotalCents = escrowCents + buyerFeeCents + taxCents

      // 🔒 SAVE DEFAULT SHIPPING (CORRECT — SEPARATE FROM DISPLAY NAME)
// 🔒 AUTO-SAVE DEFAULT SHIPPING TO PROFILES (MELO SAFE — NOT DEPENDENT ON TOGGLES)
if (session?.user?.id) {
  const trimmedName = name.trim()
  const trimmedLine1 = line1.trim()
  const trimmedCity = city.trim()
  const trimmedState = state.trim()
  const trimmedPostal = postal.trim()

  // Double safety guard (never save incomplete address)
  const isValidForProfileSave =
    trimmedName &&
    trimmedLine1 &&
    trimmedCity &&
    trimmedState &&
    trimmedPostal

  if (isValidForProfileSave) {
    const { error: profileSaveError } = await supabase
      .from("profiles")
      .update({
        // 🔴 IMPORTANT: DO NOT TOUCH display_name
        shipping_name: trimmedName,
        address_line1: trimmedLine1,
        address_line2: line2?.trim() || null,
        city: trimmedCity,
        state: trimmedState,
        postal_code: trimmedPostal,
        shipping_phone: phone?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id)

    if (profileSaveError) {
      console.error(
        "❌ Failed to save default shipping address to profiles:",
        profileSaveError
      )
    } else {
      console.log("✅ Default shipping address saved to profiles")
    }
  }
}

      // 🧾 CREATE ORDER (NOW GUARANTEED TO HAVE VALID SHIPPING)
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
          item_price_cents: itemPriceCents,
          shipping_amount_cents: shippingCents,
          tax_cents: taxCents,
          buyer_fee_cents: buyerFeeCents,
          escrow_amount_cents: escrowCents,
          shipping_name: name.trim(),
          shipping_line1: line1.trim(),
          shipping_line2: line2?.trim() || null,
          shipping_city: city.trim(),
          shipping_state: state.trim(),
          shipping_postal_code: postal.trim(),
          shipping_country: "US",
          shipping_phone: phone?.trim() || null,
          image_url: imageUrl,
          quantity: parsedQuantity,
        })
        .select()
        .single()

      if (error || !order) {
        throw new Error("Failed to create order.")
      }

      const { data, error: stripeErr } =
        await supabase.functions.invoke("create-checkout-session", {
          body: {
            order_id: order.id,
            amount: stripeTotalCents,
            email: session.user.email,
          },
        })

      if (stripeErr) throw stripeErr
      if (!data?.url)
        throw new Error("Stripe session failed to return a checkout URL.")

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

const isShippingComplete =
  name?.trim().length > 1 &&
  line1?.trim().length > 4 &&
  city?.trim().length > 1 &&
  state?.trim().length > 1 &&
  postal?.trim().length >= 5

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
      <ShippingAddress
        useSaved={useSaved}
        setUseSaved={async (v) => {
          // 🔁 TOGGLE ON → PRELOAD SAVED ADDRESS (DO NOT CLEAR)
          if (v) {
            if (hasSavedAddress) {
              await loadSavedAddress()
            }
            setUseSaved(true)
            return
          }

          // 🔁 TOGGLE OFF → CLEAR FOR NEW ADDRESS ENTRY
          setUseSaved(false)
          setName("")
          setLine1("")
          setLine2("")
          setCity("")
          setState("")
          setPostal("")
          setPhone("")
          setSaveAsDefault(false) // 🔥 REQUIRED: new address should not auto-overwrite profile
        }}
        saveAsDefault={saveAsDefault}
        setSaveAsDefault={setSaveAsDefault}
        name={name}
        setName={setName}
        line1={line1}
        setLine1={setLine1}
        line2={line2}
        setLine2={setLine2}
        city={city}
        setCity={setCity}
        state={state}
        setState={setState}
        postal={postal}
        setPostal={setPostal}
        phone={phone}
        setPhone={setPhone}
        hasSavedAddress={hasSavedAddress}
      />

      <TouchableOpacity
        style={[
          styles.primaryBtn,
          (!isShippingComplete || paying) && styles.primaryBtnDisabled,
        ]}
        onPress={payNow}
        disabled={!isShippingComplete || paying}
      >
        <Text style={styles.primaryText}>
          {paying
            ? "Processing..."
            : displayTotalCents
            ? `Pay Now • $${(displayTotalCents / 100).toFixed(2)}`
            : "Pay Now"}
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
  content: { padding: 20 },
  primaryBtn: {
    height: 54,
    borderRadius: 28,
    backgroundColor: "#0F1E17",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  reassurance: {
    fontSize: 12,
    textAlign: "center",
    color: "#6B8F7D",
    fontWeight: "600",
    marginTop: 12,
  },

  primaryBtnDisabled: {
  opacity: 0.45,
}
})