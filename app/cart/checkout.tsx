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
  shipping_type: "buyer_pays" | "seller_pays"
}

export default function CartCheckoutScreen() {
  const { session } = useAuth()

  const [cart, setCart] = useState<CartItem[]>([])
  const [paying, setPaying] = useState(false)

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
    .select("*")
    .eq("user_id", session.user.id)

  if (error) {
    handleAppError(error)
    return
  }

  const cartItems = data ?? []

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
      if (
        item.shipping_type === "buyer_pays"
      ) {
        return (
          sum +
          Math.round(
            item.shipping_price * 100
          )
        )
      }

      return sum
    }, 0)
  }, [cart])

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

  /* ---------------- CHECKOUT ---------------- */

  const handleCheckout = async () => {
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
      if (saveAsDefault) {
        await supabase
          .from("profiles")
          .update({
            shipping_name:
              name.trim(),
            address_line1:
              line1.trim(),
            address_line2:
              line2.trim() || null,
            city: city.trim(),
            state: state.trim(),
            postal_code:
              postal.trim(),
            shipping_phone:
              phone.trim() || null,
          })
          .eq(
            "id",
            session.user.id
          )
      }

      const orderIds: string[] = []

      for (const item of cart) {
        const itemPriceCents =
          Math.round(item.price * 100) *
          item.quantity

        const itemShippingCents =
          item.shipping_type ===
          "buyer_pays"
            ? Math.round(
                item.shipping_price *
                  100
              )
            : 0

        const escrowCents =
          itemPriceCents +
          itemShippingCents

        const itemTaxCents =
          Math.round(
            escrowCents * 0.075
          )

        const itemBuyerFeeCents =
          Math.round(
            escrowCents * 0.03
          ) + 30

        const totalItemCents =
          escrowCents +
          itemTaxCents +
          itemBuyerFeeCents

          const { data: listingData, error: listingErr } =
  await supabase
    .from("listings")
    .select("*")
    .eq("id", item.listing_id)
    .single()

if (listingErr || !listingData) {
  throw new Error(
    "Failed loading listing snapshot."
  )
}

        const { data: order, error } =
          await supabase
            .from("orders")
            .insert({
              buyer_id:
                session.user.id,
              seller_id:
                item.seller_id,
              listing_id:
                item.listing_id,

              status:
                "pending_payment",

              quantity:
                item.quantity,

              image_url:
                item.image_url,

              amount_cents:
                totalItemCents,

              currency: "usd",

              item_price_cents:
                itemPriceCents,

              shipping_amount_cents:
                itemShippingCents,

              tax_cents:
                itemTaxCents,

              buyer_fee_cents:
                itemBuyerFeeCents,

              escrow_amount_cents:
                escrowCents,

                listing_snapshot:
                listingData,

              shipping_name:
                name.trim(),

              shipping_line1:
                line1.trim(),

              shipping_line2:
                line2.trim() ||
                null,

              shipping_city:
                city.trim(),

              shipping_state:
                state.trim(),

              shipping_postal_code:
                postal.trim(),

              shipping_country:
                "US",

              shipping_phone:
                phone.trim() ||
                null,
            })
            .select()
            .single()

        if (error || !order) {
  console.error(
    "❌ ORDER INSERT FAILED"
  )

  console.error(
    "❌ Supabase Error Object:",
    JSON.stringify(error, null, 2)
  )

  console.error(
    "❌ Attempted Insert Payload:",
    {
      buyer_id: session.user.id,
      seller_id: item.seller_id,
      listing_id: item.listing_id,
      status: "pending_payment",
      quantity: item.quantity,
      image_url: item.image_url,
      amount_cents: totalItemCents,
      currency: "usd",
      item_price_cents: itemPriceCents,
      shipping_amount_cents: itemShippingCents,
      tax_cents: itemTaxCents,
      buyer_fee_cents: itemBuyerFeeCents,
      escrow_amount_cents: escrowCents,
      shipping_name: name.trim(),
      shipping_line1: line1.trim(),
      shipping_line2:
        line2.trim() || null,
      shipping_city: city.trim(),
      shipping_state: state.trim(),
      shipping_postal_code:
        postal.trim(),
      shipping_country: "US",
      shipping_phone:
        phone.trim() || null,
    }
  )

  throw new Error(
    error?.message ||
      "Failed creating order."
  )
}

        orderIds.push(order.id)
      }

      const { data, error } =
        await supabase.functions.invoke(
          "create-cart-checkout-session",
          {
            body: {
              order_ids: orderIds,
              amount: totalCents,
              email:
                session.user.email,
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
        fallbackMessage:
          "Checkout failed.",
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
            subtotalCents={
              subtotalCents
            }
            shippingCents={
              shippingCents
            }
            buyerFeeCents={
              buyerFeeCents
            }
            taxCents={taxCents}
            totalCents={
              totalCents
            }
            paying={paying}
            onPay={
              handleCheckout
            }
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