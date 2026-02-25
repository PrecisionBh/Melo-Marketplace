import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { supabase } from "@/lib/supabase"
import { handleAppError } from "../../lib/errors/appError"

type ConfettiPiece = {
  id: number
  left: number
  size: number
  rotate: Animated.Value
  translateY: Animated.Value
  opacity: Animated.Value
  drift: Animated.Value
}

export default function CheckoutSuccessScreen() {
  const router = useRouter()
  const { orderId } = useLocalSearchParams<{ orderId?: string }>()

  const [verifying, setVerifying] = useState(true)
  const [orderNotFound, setOrderNotFound] = useState(false)

  // Prevent double inventory updates
  const inventoryFinalizedRef = useRef(false)

  /* ---------------- CONFETTI ---------------- */
  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window")
  const confettiCount = 26

  const confetti = useMemo<ConfettiPiece[]>(() => {
    const pieces: ConfettiPiece[] = []
    for (let i = 0; i < confettiCount; i++) {
      const size = 6 + Math.floor(Math.random() * 8)
      const left = Math.floor(Math.random() * (SCREEN_W - 20))
      pieces.push({
        id: i,
        left,
        size,
        rotate: new Animated.Value(Math.random() * 180),
        translateY: new Animated.Value(-40 - Math.random() * 120),
        opacity: new Animated.Value(0),
        drift: new Animated.Value((Math.random() - 0.5) * 30),
      })
    }
    return pieces
  }, [SCREEN_W])

  const confettiRan = useRef(false)

  const popConfetti = () => {
    if (confettiRan.current) return
    confettiRan.current = true

    const animations: Animated.CompositeAnimation[] = []

    confetti.forEach((p, idx) => {
      const fallTo = SCREEN_H * 0.55 + Math.random() * (SCREEN_H * 0.25)
      const duration = 1400 + Math.floor(Math.random() * 900)
      const delay = idx * 18

      animations.push(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(p.opacity, {
              toValue: 1,
              duration: 120,
              useNativeDriver: true,
            }),
            Animated.timing(p.translateY, {
              toValue: fallTo,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(p.rotate, {
              toValue: 720 + Math.random() * 360,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(p.drift, {
              toValue: (Math.random() - 0.5) * 160,
              duration,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: 240,
            useNativeDriver: true,
          }),
        ])
      )
    })

    Animated.parallel(animations).start()
  }

  /* ---------------- VERIFY ORDER ---------------- */
  useEffect(() => {
    const verifyOrder = async () => {
      try {
        if (!orderId) {
          setVerifying(false)
          popConfetti()
          return
        }

        const { data, error } = await supabase
          .from("orders")
          .select("id")
          .eq("id", orderId)
          .single()

        if (error) {
          handleAppError(error, {
            fallbackMessage:
              "Unable to verify order. Please check your orders.",
          })
          setVerifying(false)
          popConfetti()
          return
        }

        if (!data) {
          setOrderNotFound(true)
          setVerifying(false)
          return
        }

        setVerifying(false)
        popConfetti()
      } catch (err) {
        handleAppError(err, {
          fallbackMessage:
            "Verification failed. Please check your orders.",
        })
        setVerifying(false)
        popConfetti()
      }
    }

    verifyOrder()
  }, [orderId])

  /* ---------------- 🔥 FINALIZE INVENTORY (CRITICAL) ---------------- */
  useEffect(() => {
    const finalizeInventory = async () => {
      try {
        if (!orderId) return
        if (inventoryFinalizedRef.current) return

        inventoryFinalizedRef.current = true

        // Get order + snapshot
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("id, listing_id, listing_snapshot")
          .eq("id", orderId)
          .single()

        if (orderError || !order) return

        const listingId =
          order.listing_id ?? order.listing_snapshot?.id

        if (!listingId) return

        // Fetch latest inventory (live DB, not snapshot)
        const { data: listing, error: listingError } = await supabase
          .from("listings")
          .select("id, quantity, is_sold")
          .eq("id", listingId)
          .single()

        if (listingError || !listing) return

        // Already sold = do nothing (idempotent safety)
        if (listing.is_sold) return

        // Default quantity = 1 (backwards compatible)
        let purchasedQty = 1

        // Future-proof: if you later store quantity in snapshot
        if (
          order.listing_snapshot &&
          typeof order.listing_snapshot === "object" &&
          "quantity" in order.listing_snapshot
        ) {
          const q = Number(order.listing_snapshot.quantity)
          if (!isNaN(q) && q > 0) {
            purchasedQty = q
          }
        }

        const currentQty = Number(listing.quantity ?? 1)
        const newQty = Math.max(0, currentQty - purchasedQty)

        await supabase
          .from("listings")
          .update({
            quantity: newQty,
            is_sold: newQty === 0,
          })
          .eq("id", listingId)
      } catch (err) {
        console.warn("Inventory finalization failed:", err)
      }
    }

    finalizeInventory()
  }, [orderId])

  /* ---------------- LOADING ---------------- */
  if (verifying) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Success" backRoute="/" />
        <ActivityIndicator size="large" style={{ marginTop: 120 }} />
        <Text style={styles.verifyingText}>Finalizing...</Text>
      </View>
    )
  }

  if (orderNotFound) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Checkout" backRoute="/" />

        <View style={styles.top}>
          <Ionicons
            name="alert-circle-outline"
            size={84}
            color="#EB5757"
            style={{ marginBottom: 18 }}
          />
          <Text style={styles.title}>Order Not Found</Text>
          <Text style={styles.subtitle}>
            We couldn’t locate your order. If you were charged,
            please contact support.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace("/buyer-hub/orders")}
          >
            <Text style={styles.primaryText}>View My Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.secondaryText}>
              Continue Browsing
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  /* ---------------- SUCCESS UI ---------------- */
  return (
    <View style={styles.root}>
      <AppHeader title="Success" backRoute="/" />

      <View style={styles.screen}>
        <View pointerEvents="none" style={styles.confettiLayer}>
          {confetti.map((p) => (
            <Animated.View
              key={p.id}
              style={[
                styles.confettiPiece,
                {
                  width: p.size,
                  height: p.size * 1.6,
                  left: p.left,
                  opacity: p.opacity,
                  transform: [
                    { translateX: p.drift },
                    { translateY: p.translateY },
                    {
                      rotate: p.rotate.interpolate({
                        inputRange: [0, 720],
                        outputRange: ["0deg", "720deg"],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.top}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark" size={44} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>Payment Successful</Text>

          <Text style={styles.subtitle}>
            Your payment is secured in escrow and the seller has
            been notified.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons
              name="receipt-outline"
              size={20}
              color="#1F7A63"
            />
            <Text style={styles.cardTitle}>
              What happens next?
            </Text>
          </View>

          <Text style={styles.cardText}>
            The seller has been notified and will prepare your
            order for shipment.
          </Text>

          <Text style={styles.cardText}>
            You can track shipping, delivery, and status updates
            from your Orders page at any time.
          </Text>

          <Text style={styles.cardText}>
            Your payment remains protected in escrow until
            delivery is confirmed.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace("/buyer-hub/orders")}
          >
            <Text style={styles.primaryText}>View My Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.secondaryText}>
              Continue Browsing
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EAF4EF" },
  screen: { flex: 1, paddingHorizontal: 24, paddingTop: 18 },
  verifyingText: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#2E5F4F",
  },
  confettiLayer: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  confettiPiece: {
    position: "absolute",
    top: 0,
    borderRadius: 6,
    backgroundColor: "#7FAF9B",
  },
  top: { alignItems: "center", marginBottom: 22, marginTop: 18 },
  successIconWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#1F7A63",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F1E17",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B8F7D",
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#DDEDE6",
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F1E17",
  },
  cardText: {
    fontSize: 13,
    color: "#6B8F7D",
    lineHeight: 18,
    marginBottom: 8,
    fontWeight: "600",
  },
  actions: { gap: 12, paddingBottom: 24 },
  primaryBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: "#1F7A63",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
  },
  secondaryBtn: {
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "#7FAF9B",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: "#1F7A63",
    fontWeight: "900",
    fontSize: 14,
  },
})