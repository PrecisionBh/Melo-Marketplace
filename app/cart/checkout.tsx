
import BuyerProtectionNotice from "@/components/checkout/BuyerProtectionNotice"
import CartPreviewCarousel from "@/components/checkout/CartPreviewCarousel"
import CheckoutShippingCard from "@/components/checkout/CheckoutShippingCard"
import CheckoutSummaryCard from "@/components/checkout/CheckoutSummaryCard"
import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"
import * as Linking from "expo-linking"

import { useFocusEffect } from "expo-router"
import { useCallback, useMemo, useState } from "react"
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

type CartItem = {
  id: string
  seller_id: string
  listing_id: string
  title: string
  price: number
  image_url: string | null
  quantity: number
  shipping_price: number
  shipping_cents?: number
  shipping_type: "buyer_pays" | "seller_pays"
}

export default function CartCheckoutScreen() {
  const { session } = useAuth()

  const [cart, setCart] = useState<CartItem[]>([])
  const [paying, setPaying] = useState(false)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingVerified, setShippingVerified] = useState(false)

  const [shippingExpanded, setShippingExpanded] =
    useState(true)

  const [saveAsDefault, setSaveAsDefault] =
    useState(false)

  const [name, setName] = useState("")
  const [line1, setLine1] = useState("")
  const [line2, setLine2] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [postal, setPostal] = useState("")
  const [phone, setPhone] = useState("")

  /* ---------------- LOAD ---------------- */

  useFocusEffect(
  useCallback(() => {
    loadCart()
    loadSavedAddress()
  }, [session?.user?.id])
)

 const loadCart = async () => {
  if (!session?.user?.id) return

 const { data, error } = await supabase
  .from("cart_items")
  .select(`
    *,
    listings (
      user_id
    )
  `)
  .eq("user_id", session.user.id)

  if (error) {
    handleAppError(error)
    return
  }

  const cartItems = (data ?? []).map((item) => ({
  ...item,
  seller_id: item.listings?.user_id,
}))

  if (cartItems.length === 0) {
    setCart([])
    return
  }

  const listingIds = cartItems.map(
    (item) => item.listing_id
  )

  const {
    data: listings,
    error: listingsError,
  } = await supabase
    .from("listings")
    .select(
      "id, is_sold, status, quantity_available"
    )
    .in("id", listingIds)

  if (listingsError) {
    handleAppError(listingsError)
    return
  }

  const listingMap = new Map(
    (listings ?? []).map((listing) => [
      listing.id,
      listing,
    ])
  )

  const invalidCartItemIds: string[] = []
  const validCartItems = cartItems.filter(
    (item) => {
      const listing = listingMap.get(
        item.listing_id
      )

      if (!listing) {
        invalidCartItemIds.push(item.id)
        return false
      }

      const unavailable =
        listing.is_sold === true ||
        listing.status !== "active" ||
        (listing.quantity_available ?? 0) <
          item.quantity

      if (unavailable) {
        invalidCartItemIds.push(item.id)
        return false
      }

      return true
    }
  )

  if (invalidCartItemIds.length > 0) {
    const { error: deleteError } =
      await supabase
        .from("cart_items")
        .delete()
        .in("id", invalidCartItemIds)

    if (deleteError) {
      handleAppError(deleteError)
    } else {
      Alert.alert(
        "Cart Updated",
        "Some items were removed because they are no longer available."
      )
    }
  }

  setCart(validCartItems)
}

  const loadSavedAddress = async () => {
    if (!session?.user?.id) return

    const { data } = await supabase
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

    if (!data) return

    setName(data.shipping_name ?? "")
    setLine1(data.address_line1 ?? "")
    setLine2(data.address_line2 ?? "")
    setCity(data.city ?? "")
    setState(data.state ?? "")
    setPostal(data.postal_code ?? "")
    setPhone(data.shipping_phone ?? "")
  }

const getShippingQuote = async (item: CartItem) => {
  try {
    console.log("📦 ITEM LISTING ID:", item.listing_id)

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, user_id")
      .eq("id", item.listing_id)
      .single()

    console.log("📦 LISTING FETCH:", listing)
    console.log("📦 LISTING ERROR:", listingError)

    if (listingError || !listing?.user_id) {
      console.warn("❌ Listing lookup failed")
      return 0
    }

    const { data: seller, error } = await supabase
      .from("profiles")
      .select(`
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        shipping_name
      `)
      .eq("id", listing.user_id)
      .single()

    console.log("🧾 SELLER PROFILE:", seller)
    console.log("🧾 SELLER ERROR:", error)
    console.log("🧾 FETCHING PROFILE ID:", listing.user_id)

    if (error || !seller) {
      console.warn("⚠️ Missing seller address")
      return 0
    }

    const toAddress = {
      name: name || "Customer",
      street1: line1?.trim(),
      street2: line2?.trim() || undefined,
      city: city?.trim(),
      state: state?.trim(),
      zip: String(postal).slice(0, 5),
      country: "US",
    }

    const fromAddress = {
      name: seller.shipping_name || "Seller",
      street1: seller.address_line1?.trim(),
      street2: seller.address_line2?.trim() || undefined,
      city: seller.city?.trim(),
      state: seller.state?.trim(),
      zip: seller.postal_code
        ? String(seller.postal_code).slice(0, 5)
        : "",
      country: "US",
    }

    console.log("📬 TO ADDRESS:", toAddress)
    console.log("📤 FROM ADDRESS:", fromAddress)

    if (
      !fromAddress.street1 ||
      !fromAddress.city ||
      !fromAddress.state ||
      !fromAddress.zip
    ) {
      console.warn("❌ SELLER ADDRESS INVALID:", fromAddress)
      return 0
    }

    const res = await fetch(
      "https://ccrrxdpfepsoghtgtpwx.functions.supabase.co/get-shipping-quote",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: toAddress,
          from: fromAddress,
          weight: 16,
        }),
      }
    )

    const data = await res.json()

    console.log("📦 SHIPPING RATE:", data)

    if (!data?.rate) {
      console.warn("⚠️ No shipping rate returned")
      throw new Error("Shipping rate unavailable")
    }

    return Math.round(Number(data.rate) * 100)
  } catch (err) {
    console.warn("⚠️ shipping quote failed", err)
    throw err
  }
}

/* ---------------- CALCULATE SHIPPING ---------------- */

const calculateShipping = async () => {
  if (!cart.length) return

  setShippingLoading(true)

  try {
    const updatedCart = await Promise.all(
      cart.map(async (item) => {
        if (item.shipping_type !== "buyer_pays") {
          return {
            ...item,
            shipping_cents: 0,
          }
        }

        let rate = 0

        try {
          rate = await getShippingQuote(item)
        } catch (err) {
          console.warn("⚠️ Shipping error for item:", item.id)
          Alert.alert(
            "Shipping Error",
            "Unable to calculate shipping. Please check your address."
          )
        }

        return {
          ...item,
          shipping_cents: rate,
        }
      })
    )

    setCart(updatedCart)
  } catch (err) {
    console.warn("⚠️ shipping calc failed", err)
  } finally {
    setShippingLoading(false)
  }
}

/* ---------------- TOTALS ---------------- */

const subtotalCents = useMemo(() => {
  return cart.reduce(
    (sum, item) =>
      sum +
      Math.round(item.price * 100) *
        item.quantity,
    0
  )
}, [cart])

const shippingCents = useMemo(() => {
  return cart.reduce((sum, item) => {
    if (item.shipping_type === "buyer_pays") {
      return sum + (item.shipping_cents || 0)
    }
    return sum
  }, 0)
}, [cart])

const buyerFeeCents = useMemo(() => {
  const escrow =
    subtotalCents + shippingCents

  return Math.round(escrow * 0.03) + 30
}, [subtotalCents, shippingCents])

const taxCents = useMemo(() => {
  const escrow =
    subtotalCents + shippingCents

  return Math.round(escrow * 0.075)
}, [subtotalCents, shippingCents])

const totalCents =
  subtotalCents +
  shippingCents +
  buyerFeeCents +
  taxCents

/* ---------------- VERIFY ADDRESS ---------------- */

const verifyCheckoutAddress = async () => {
  try {
    const res = await fetch(
      "https://ccrrxdpfepsoghtgtpwx.functions.supabase.co/verify-address",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address_line1: line1,
          address_line2: line2,
          city,
          state,
          postal_code: postal,
        }),
      }
    )

    const text = await res.text()

    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  } catch (err) {
    console.warn("⚠️ VERIFY FAILED:", err)
    return null
  }
}

/* ---------------- CHECKOUT ---------------- */

const handleCheckout = async () => {
  if (shippingLoading) {
    Alert.alert("Please wait", "Calculating shipping...")
    return
  }

  if (!session?.user?.id) return

  if (!cart.length) {
    Alert.alert(
      "Cart Empty",
      "Your cart no longer has available items."
    )
    return
  }

  const valid =
    name.trim() &&
    line1.trim() &&
    city.trim() &&
    state.trim() &&
    postal.trim()

  if (!valid) {
    Alert.alert(
      "Missing Shipping Info",
      "Please complete your shipping address."
    )
    return
  }

  setPaying(true)

  try {
    /* 🔥 VERIFY ADDRESS */
    const verifyData = await verifyCheckoutAddress()

    if (
      verifyData &&
      !verifyData?.fallback &&
      !verifyData?.verifications?.delivery?.success
    ) {
      Alert.alert(
        "Invalid Address",
        "Please enter a valid shipping address."
      )
      setPaying(false)
      return
    }

    console.log("🚀 Creating orders...")

    /* 🔥 STEP 1 — CREATE ORDERS */
    const createdOrderIds: string[] = []

    for (const item of cart) {
      const itemPriceCents =
        Math.round(item.price * 100) * item.quantity

      const shippingCents = item.shipping_cents || 0

      const escrowCents =
        itemPriceCents + shippingCents

      const { data: order, error } =
  await supabase
    .from("orders")
    .insert({
      buyer_id: session.user.id,
      seller_id: item.seller_id,
      listing_id: item.listing_id,

      status: "pending_payment",
      quantity: item.quantity,

      image_url: item.image_url,

      amount_cents: escrowCents,
      currency: "usd",

      item_price_cents: itemPriceCents,
      shipping_amount_cents: shippingCents,

      buyer_fee_cents: 0,
      tax_cents: 0,
      escrow_amount_cents: escrowCents,

      // 🔥 THIS IS WHAT WAS MISSING
      listing_snapshot: {
        listing_id: item.listing_id,
        title: item.title,
        image_url: item.image_url,
        price: item.price,
        quantity: item.quantity,
        shipping_type: item.shipping_type,
        shipping_price: item.shipping_cents || 0,
      },

      shipping_name: name.trim(),
      shipping_line1: line1.trim(),
      shipping_line2: line2.trim() || null,
      shipping_city: city.trim(),
      shipping_state: state.trim(),
      shipping_postal_code: postal.trim(),
      shipping_country: "US",
      shipping_phone: phone.trim() || null,
    })
    .select("id")
    .single()

      if (error || !order) {
        console.error("❌ Order insert failed:", error)
        throw new Error("Failed to create order")
      }

      createdOrderIds.push(order.id)
    }

    console.log("🧾 Created order IDs:", createdOrderIds)

    /* 🔥 STEP 2 — CALL STRIPE FUNCTION */
    const { data, error } =
      await supabase.functions.invoke(
        "create-cart-checkout-session",
        {
          body: {
            order_ids: createdOrderIds,
            amount: totalCents,
            email: session.user.email,
          },
        }
      )

    console.log("🧪 Checkout response:", data)

    if (error || !data?.url) {
      console.error("❌ Stripe session error:", error)
      throw new Error("Failed to create checkout session")
    }

    /* 🔥 STEP 3 — REDIRECT TO STRIPE */
    await Linking.openURL(data.url)

  } catch (err) {
    console.error("❌ Checkout failed:", err)
    Alert.alert("Checkout failed", "Please try again.")
  } finally {
    setPaying(false)
  }
}

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
        >
          <Text style={styles.title}>
            Review Order
          </Text>

          <CartPreviewCarousel
            items={cart}
          />

          <CheckoutShippingCard
            expanded={
              shippingExpanded
            }
            setExpanded={
              setShippingExpanded
            }
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
            saveAsDefault={
              saveAsDefault
            }
            setSaveAsDefault={
              setSaveAsDefault
            }
          />

          <CheckoutSummaryCard
  subtotalCents={subtotalCents}
  shippingCents={shippingCents}
  buyerFeeCents={buyerFeeCents}
  taxCents={taxCents}
  totalCents={totalCents}
  paying={paying}
  onPay={async () => {
  if (!shippingVerified) {
    await calculateShipping()
    setShippingVerified(true)
    return
  }

  handleCheckout()
}}
  shippingLoading={shippingLoading}
  shippingVerified={shippingVerified}
/>

          <BuyerProtectionNotice />
        </ScrollView>
      </KeyboardAvoidingView>

      <GlobalFooter
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  content: {
    padding: 16,
    paddingBottom: 140,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginBottom: 20,
  },
})