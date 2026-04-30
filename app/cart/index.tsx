import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"
import { useAuth } from "@/context/AuthContext"
import { useCart } from "@/context/CartContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"
import { Ionicons } from "@expo/vector-icons"
import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

type CartItem = {
  id: string
  listing_id: string
  title: string
  price: number
  image_url: string | null
  quantity: number
  shipping_price: number
  size?: string | null 
  subcategory?: string | null
}

export default function CartScreen() {
  const { session } = useAuth()
  const router = useRouter()

  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const { refreshCartCount } = useCart()

  useEffect(() => {
  if (session?.user?.id) {
    loadCart()
  }
}, [session?.user?.id])

 const loadCart = async () => {
  if (!session?.user?.id) return

  const { data, error } = await supabase
  .from("cart_items")
  .select(`
  *,
  listings (
    user_id,
    subcategory
  )
`)
  .eq("user_id", session.user.id)

  if (error) {
  handleAppError(error)
  setLoading(false)
  return
}

  const cartItems = (data ?? []).map((item) => ({
  ...item,
  seller_id: item.listings?.user_id,
  subcategory: item.listings?.subcategory ?? null, // ✅ ADD THIS
}))

  if (cartItems.length === 0) {
  setCart([])
  await refreshCartCount()
  setLoading(false)
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
  setLoading(false)
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

await refreshCartCount()

setLoading(false)
}

 const removeItem = async (id: string) => {
  try {
    console.log("🗑 Removing cart item:", id)

    const { data, error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", id)
      .select()

    console.log("DELETE RESULT:", data)

    if (error) throw error

    setCart((prev) =>
      prev.filter((x) => x.id !== id)
    )

    await refreshCartCount()
  } catch (err) {
    console.error("DELETE FAILED:", err)

    handleAppError(err, {
      fallbackMessage:
        "Failed to remove item.",
    })
  }
}

  const subtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) =>
        sum +
        item.price * item.quantity,
      0
    )
  }, [cart])

  const shippingTotal = useMemo(() => {
    return cart.reduce(
      (sum, item) =>
        sum + item.shipping_price,
      0
    )
  }, [cart])

  const total = subtotal + shippingTotal

  const handleCheckout = () => {
    if (!cart.length) {
      Alert.alert(
        "Cart Empty",
        "Add items before checking out."
      )
      return
    }

    router.push("/cart/checkout")
  }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator
            size="large"
            color="#D97732"
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
        >
          <Text style={styles.title}>
            Your Cart
          </Text>

          {cart.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons
                name="cart-outline"
                size={42}
                color="#AAA"
              />

              <Text style={styles.emptyTitle}>
                Your cart is empty
              </Text>

              <Text style={styles.emptySub}>
                Add items to start checking
                out.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.cartList}>
                {cart.map((item) => (
                  <View
                    key={item.id}
                    style={styles.card}
                  >
                    <Image
                      source={
                        item.image_url ??
                        undefined
                      }
                      style={styles.image}
                      contentFit="cover"
                    />

                    <View style={styles.info}>
                      <Text
                        numberOfLines={1}
                        style={
                          styles.itemTitle
                        }
                      >
                        {item.title}
                      </Text>

                      <Text style={styles.itemMeta}>
  Qty: {item.quantity}
</Text>

{item.size && (
  <Text style={styles.itemMeta}>
    Size: {item.size}
  </Text>
)}

{item.subcategory && (
  <Text style={styles.itemMeta}>
    {item.subcategory.replace(/_/g, " ")}
  </Text>
)}

                      <Text
                        style={styles.price}
                      >
                        $
                        {(
                          item.price *
                          item.quantity
                        ).toFixed(2)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        removeItem(item.id)
                      }
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#94A3B8"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.summaryCard}>
                <View style={styles.totalRow}>
                  <Text
                    style={styles.totalLabel}
                  >
                    Total ({cart.length}{" "}
                    {cart.length === 1
                      ? "item"
                      : "items"})
                  </Text>

                  <Text
                    style={styles.totalValue}
                  >
                    ${total.toFixed(2)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.checkoutBtn}
                  onPress={
                    handleCheckout
                  }
                >
                  <Text
                    style={
                      styles.checkoutText
                    }
                  >
                    Checkout
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      )}

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

  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  content: {
    padding: 16,
    paddingBottom: 140,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 20,
    color: "#111",
  },

  emptyWrap: {
    marginTop: 80,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    marginTop: 12,
  },

  emptySub: {
    fontSize: 13,
    color: "#777",
    marginTop: 6,
  },

  cartList: {
    gap: 14,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },

  image: {
    width: 86,
    height: 86,
    borderRadius: 18,
    marginRight: 16,
    backgroundColor: "#EEE",
  },

  info: {
    flex: 1,
  },

  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  itemMeta: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },

  price: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111",
    marginTop: 8,
  },

  summaryCard: {
    marginTop: 28,
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalLabel: {
    fontSize: 17,
    color: "#6B7280",
    fontWeight: "500",
  },

  totalValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111",
  },

  checkoutBtn: {
    marginTop: 18,
    backgroundColor: "#D97732",
    paddingVertical: 17,
    borderRadius: 18,
    alignItems: "center",
  },

  checkoutText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 15,
  },
})