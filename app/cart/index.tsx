import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"
import { useAuth } from "@/context/AuthContext"
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
}

export default function CartScreen() {
  const { session } = useAuth()
  const router = useRouter()

  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCart()
  }, [])

  const loadCart = async () => {
    try {
      if (!session?.user?.id) return

      setLoading(true)

      const { data, error } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", {
          ascending: false,
        })

      if (error) throw error

      setCart(data ?? [])
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to load cart.",
      })
    } finally {
      setLoading(false)
    }
  }

  const removeItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", id)

      if (error) throw error

      setCart((prev) =>
        prev.filter((x) => x.id !== id)
      )
    } catch (err) {
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

    router.push("/checkout/cart")
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

                      <Text
                        style={
                          styles.itemMeta
                        }
                      >
                        Qty: {item.quantity}
                      </Text>

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
                <SummaryRow
                  label="Subtotal"
                  value={`$${subtotal.toFixed(
                    2
                  )}`}
                />

                <SummaryRow
                  label="Shipping"
                  value={`$${shippingTotal.toFixed(
                    2
                  )}`}
                />

                <View style={styles.divider} />

                <SummaryRow
                  label="Total"
                  value={`$${total.toFixed(
                    2
                  )}`}
                  bold
                />

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
        cartCount={cart.length}
      />
    </View>
  )
}

function SummaryRow({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <View style={styles.summaryRow}>
      <Text
        style={[
          styles.summaryLabel,
          bold && styles.boldText,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.summaryValue,
          bold && styles.boldText,
        ]}
      >
        {value}
      </Text>
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
    gap: 12,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  image: {
    width: 80,
    height: 80,
    borderRadius: 14,
    marginRight: 14,
    backgroundColor: "#EEE",
  },

  info: {
    flex: 1,
  },

  itemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },

  itemMeta: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },

  price: {
    fontSize: 17,
    fontWeight: "800",
    color: "#D97732",
    marginTop: 6,
  },

  summaryCard: {
    marginTop: 20,
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },

  summaryValue: {
    fontSize: 14,
    color: "#111",
  },

  boldText: {
    fontWeight: "800",
    fontSize: 16,
    color: "#111",
  },

  divider: {
    height: 1,
    backgroundColor: "#EEE",
    marginVertical: 12,
  },

  checkoutBtn: {
    marginTop: 16,
    backgroundColor: "#D97732",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
  },

  checkoutText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 15,
  },
})