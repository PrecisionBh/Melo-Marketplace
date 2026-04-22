import * as Linking from "expo-linking"

import BuyerProtectionNotice from "@/components/checkout/BuyerProtectionNotice"
import CartPreviewCarousel from "@/components/checkout/CartPreviewCarousel"
import CheckoutShippingCard from "@/components/checkout/CheckoutShippingCard"
import CheckoutSummaryCard from "@/components/checkout/CheckoutSummaryCard"
import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

import { useLocalSearchParams } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native"

type OfferCheckoutData = {
  offer_id: string
  listing_id: string
  seller_id: string
  buyer_id: string
  quantity: number
  accepted_price: number
  accepted_title: string | null
  accepted_image_url: string | null
  accepted_shipping_type: "buyer_pays" | "seller_pays"
  accepted_shipping_price: number
  status: string
  listings?: {
    id: string
    title: string | null
    image_urls: string[] | null
    user_id: string
    quantity_available: number | null
    shipping_type: "buyer_pays" | "seller_pays" | null
    shipping_price: number | null
    price: number | null
  } | null
}

export default function OfferCheckoutScreen() {
  const { offerId, orderId } = useLocalSearchParams<{
  offerId: string
  orderId?: string
}>()
  const { session } = useAuth()

  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [offer, setOffer] =
    useState<OfferCheckoutData | null>(null)
    const [shippingCentsState, setShippingCentsState] = useState(0)
const [shippingLoading, setShippingLoading] = useState(false)
const [shippingVerified, setShippingVerified] = useState(false)

useEffect(() => {
  if (offerId && session?.user?.id) {
    loadOffer()
    loadSavedAddress()
  }
}, [offerId, session?.user?.id])

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

    console.log("VERIFY STATUS:", res.status)
    console.log("VERIFY RAW:", text)

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

  const loadOffer = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("offers")
        .select(
          `
          id,
          listing_id,
          seller_id,
          buyer_id,
          quantity,
          status,
          accepted_price,
          accepted_title,
          accepted_image_url,
          accepted_shipping_type,
          accepted_shipping_price,
          listings (
            id,
            title,
            image_urls,
            user_id,
            quantity_available,
            shipping_type,
            shipping_price,
            price
          )
        `
        )
        .eq("id", offerId)
        .single()

      if (error) throw error
      if (!data) throw new Error("Offer not found.")

      const typed = data as any

      if (typed.buyer_id !== session?.user?.id) {
        throw new Error(
          "You are not authorized to pay for this offer."
        )
      }

      if (typed.status !== "accepted") {
        throw new Error(
          "This offer is not currently awaiting payment."
        )
      }

      const quantity = Number(typed.quantity ?? 1)

      setOffer({
        offer_id: typed.id,
        listing_id: typed.listing_id,
        seller_id: typed.seller_id,
        buyer_id: typed.buyer_id,
        quantity,
        accepted_price: Number(
          typed.accepted_price ?? 0
        ),
        accepted_title:
          typed.accepted_title ?? null,
        accepted_image_url:
          typed.accepted_image_url ?? null,
        accepted_shipping_type:
          typed.accepted_shipping_type ===
          "buyer_pays"
            ? "buyer_pays"
            : "seller_pays",
        accepted_shipping_price: Number(
          typed.accepted_shipping_price ?? 0
        ),
        status: typed.status,
        listings: typed.listings
          ? {
              id: typed.listings.id,
              title: typed.listings.title ?? null,
              image_urls:
                typed.listings.image_urls ?? null,
              user_id: typed.listings.user_id,
              quantity_available:
                typed.listings.quantity_available ?? null,
              shipping_type:
                typed.listings.shipping_type ??
                null,
              shipping_price:
                typed.listings.shipping_price ?? null,
              price: typed.listings.price ?? null,
            }
          : null,
      })
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to load offer checkout.",
      })
    } finally {
      setLoading(false)
    }
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

  const image =
  offer?.accepted_image_url ??
  offer?.listings?.image_urls?.[0] ??
  null

const title =
  offer?.accepted_title ??
  offer?.listings?.title ??
  "Order"

const quantity = offer?.quantity ?? 1

const previewItems = offer
  ? [
      {
        id: offer.offer_id,
        seller_id: offer.seller_id,
        listing_id: offer.listing_id,
        title,
        price: offer.accepted_price,
        image_url: image,
        quantity,
        shipping_price: offer.accepted_shipping_price || 0,
        shipping_type: offer.accepted_shipping_type,
      },
    ]
  : []

  /* ---------------- SHIPPING QUOTE ---------------- */

const getShippingQuote = async () => {
  try {
    if (!offer) return 0

    // 🔥 FETCH SELLER PROFILE
    const { data: seller, error } = await supabase
      .from("profiles")
      .select(`
        address_line1,
        address_line2,
        city,
        state,
        postal_code
      `)
      .eq("id", offer.seller_id)
      .single()

      console.log("🧾 SELLER PROFILE:", seller)
console.log("🧾 SELLER ERROR:", error)

    if (error || !seller) {
      console.warn("⚠️ Missing seller address")
      return 0
    }

    // 🔥 CALL SHIPPING FUNCTION
    const res = await fetch(
      "https://ccrrxdpfepsoghtgtpwx.functions.supabase.co/get-shipping-quote",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: {
            name: name || "Customer",
            street1: line1,
            street2: line2,
            city,
            state,
            zip: postal,
            country: "US",
          },
          from: {
            name: "Seller",
            street1: seller.address_line1,
            street2: seller.address_line2,
            city: seller.city,
            state: seller.state,
            zip: seller.postal_code,
            country: "US",
          },
          weight: 16,
        }),
      }
    )

    const data = await res.json()

    console.log("📦 SHIPPING RATE:", data)

    return Math.round(Number(data.rate) * 100)
  } catch (err) {
    console.warn("⚠️ shipping quote failed", err)
    return 0
  }
}

const calculateShipping = async () => {
  if (!offer) return

  if (offer.accepted_shipping_type !== "buyer_pays") {
    setShippingCentsState(0)
    return
  }

  setShippingLoading(true)

  try {
    const rate = await getShippingQuote()
    setShippingCentsState(rate)
  } catch (err) {
    console.warn("⚠️ shipping calc failed", err)
    setShippingCentsState(0)
    Alert.alert(
      "Shipping Error",
      "Unable to calculate shipping. Please check your address."
    )
  } finally {
    setShippingLoading(false)
  }
}

  const subtotalCents = useMemo(() => {
    if (!offer) return 0
    return (
      Math.round(offer.accepted_price * 100) *
      quantity
    )
  }, [offer, quantity])

  const shippingCents = shippingCentsState

  const buyerFeeCents = useMemo(() => {
    const escrow =
      subtotalCents + shippingCents

    return Math.round(
      escrow * 0.03
    ) + 30
  }, [subtotalCents, shippingCents])

  const taxCents = useMemo(() => {
    const escrow =
      subtotalCents + shippingCents

    return Math.round(
      escrow * 0.075
    )
  }, [subtotalCents, shippingCents])

  const totalCents =
    subtotalCents +
    shippingCents +
    buyerFeeCents +
    taxCents

  const handleCheckout = async () => {
  if (shippingLoading) {
    Alert.alert("Please wait", "Calculating shipping...")
    return
  }
  if (!session?.user?.id || !offer) return

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

    const finalLine1 =
      verifyData?.verifications?.delivery?.success
        ? verifyData.street1 ?? line1
        : line1

    const finalLine2 =
      verifyData?.verifications?.delivery?.success
        ? verifyData.street2 ?? line2
        : line2

    const finalCity =
      verifyData?.verifications?.delivery?.success
        ? verifyData.city ?? city
        : city

    const finalState =
      verifyData?.verifications?.delivery?.success
        ? verifyData.state ?? state
        : state

    const finalPostal =
      verifyData?.verifications?.delivery?.success
        ? verifyData.zip ?? postal
        : postal

   if (
  verifyData &&
  !verifyData?.fallback &&
  !verifyData?.verifications?.delivery?.success
) {
  Alert.alert(
    "Invalid Address",
    "Please enter a valid shipping address."
  )
  return
}

    /* optional UI update */
    setLine1(finalLine1)
    setLine2(finalLine2)
    setCity(finalCity)
    setState(finalState)
    setPostal(finalPostal)


    if (saveAsDefault) {
      await supabase
        .from("profiles")
        .update({
          shipping_name: name.trim(),
          address_line1: finalLine1.trim(),
          address_line2:
            finalLine2.trim() || null,
          city: finalCity.trim(),
          state: finalState.trim(),
          postal_code: finalPostal.trim(),
          shipping_phone:
            phone.trim() || null,
        })
        .eq("id", session.user.id)
    }

    let orderIdToUse = orderId

    if (!orderIdToUse) {
      const { data: existingPendingOrder } =
        await supabase
          .from("orders")
          .select("id")
          .eq("buyer_id", session.user.id)
          .eq("offer_id", offer.offer_id)
          .eq("status", "pending_payment")
          .maybeSingle()

      orderIdToUse =
        existingPendingOrder?.id
    }

    if (!orderIdToUse) {
      const listingSnapshot = {
        ...(offer.listings ?? {}),
        accepted_offer: true,
        accepted_price:
          offer.accepted_price,
        accepted_quantity:
          offer.quantity,
        accepted_shipping_type:
          offer.accepted_shipping_type,
        accepted_shipping_price:
          offer.accepted_shipping_price,
        accepted_title: title,
        accepted_image_url: image,
      }

      const escrowCents =
        subtotalCents + shippingCents

      const { data: order, error } =
        await supabase
          .from("orders")
          .insert({
            buyer_id: session.user.id,
            seller_id: offer.seller_id,
            listing_id: offer.listing_id,
            offer_id: offer.offer_id,

            status: "pending_payment",
            quantity: offer.quantity,

            image_url: image,

            amount_cents: totalCents,
            currency: "usd",

            item_price_cents:
              subtotalCents,
            shipping_amount_cents:
              shippingCents,
            tax_cents: taxCents,
            buyer_fee_cents:
              buyerFeeCents,
            escrow_amount_cents:
              escrowCents,

            listing_snapshot:
              listingSnapshot,

            // 🔥 FIXED ADDRESS
            shipping_name: name.trim(),
            shipping_line1:
              finalLine1.trim(),
            shipping_line2:
              finalLine2.trim() || null,
            shipping_city:
              finalCity.trim(),
            shipping_state:
              finalState.trim(),
            shipping_postal_code:
              finalPostal.trim(),
            shipping_country: "US",
            shipping_phone:
              phone.trim() || null,
          })
          .select("id")
          .single()

      if (error || !order) {
        console.error(
          "❌ OFFER ORDER INSERT FAILED",
          JSON.stringify(error, null, 2)
        )

        throw new Error(
          error?.message ||
            "Failed creating offer order."
        )
      }

      orderIdToUse = order.id
    }

    const { data, error } =
      await supabase.functions.invoke(
        "create-cart-checkout-session",
        {
          body: {
            order_ids: [orderIdToUse],
            amount: totalCents,
            email: session.user.email,
          },
        }
      )

    if (error || !data?.url) {
      throw new Error(
        "Failed to create checkout session."
      )
    }

    await Linking.openURL(data.url)
  } catch (err) {
    handleAppError(err, {
      fallbackMessage: "Checkout failed.",
    })
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

          <CartPreviewCarousel items={previewItems} />

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

      <GlobalFooter />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F8F8",
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
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