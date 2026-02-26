import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

export default function CheckoutCancelScreen() {
  const router = useRouter()
  const { orderId } = useLocalSearchParams<{ orderId?: string }>()

  const [updating, setUpdating] = useState(true)

  useEffect(() => {
    const markCancelled = async () => {
      console.log("🚨 CANCEL SCREEN LOADED")
      console.log("🧾 Order ID:", orderId)

      if (!orderId) {
        console.log("⚠️ No orderId provided on cancel route")
        setUpdating(false)
        return
      }

      try {
        // 🔍 STEP 1: Fetch current order status (critical for race safety)
        const { data: order, error: fetchError } = await supabase
          .from("orders")
          .select("id, status")
          .eq("id", orderId)
          .single()

        if (fetchError) {
          console.error("❌ Fetch order error:", fetchError)
          throw fetchError
        }

        if (!order) {
          console.log("⚠️ No order found for ID:", orderId)
          setUpdating(false)
          return
        }

        console.log("📦 Current DB Order Status:", order.status)

        // 🛑 ONLY cancel if still awaiting payment
        // This prevents overwriting a paid order if Stripe webhook already succeeded
        if (order.status === "pending_payment") {
          console.log("🛑 Order still pending_payment → marking as cancelled_payment")

          const { data: updatedOrder, error: updateError } = await supabase
            .from("orders")
            .update({
              status: "cancelled_payment", // MUST match your DB constraint exactly
            })
            .eq("id", orderId)
            .select("id, status")
            .single()

          if (updateError) {
            console.error("❌ Cancel update error:", updateError)
            throw updateError
          }

          console.log("✅ Order successfully updated:", updatedOrder)
        } else {
          // 🔐 IMPORTANT: This will tell us if webhook already changed it to "paid"
          console.log(
            "⚠️ Cancel skipped — order not pending_payment. Current status:",
            order.status
          )
        }
      } catch (err) {
        console.error("💥 Cancel flow exception:", err)
        handleAppError(err, {
          context: "checkout_cancel_update",
          fallbackMessage: "Failed to update cancelled payment state.",
        })
      } finally {
        setUpdating(false)
      }
    }

    markCancelled()
  }, [orderId])

  return (
    <View style={styles.screen}>
      <AppHeader title="Payment Cancelled" backRoute="/" />

      <View style={styles.container}>
        {updating ? (
          <ActivityIndicator size="large" color="#7FAF9B" />
        ) : (
          <>
            {/* ❌ Cancel Icon */}
            <View style={styles.iconWrap}>
              <Ionicons name="close-circle" size={90} color="#E74C3C" />
            </View>

            {/* Title */}
            <Text style={styles.title}>Payment Cancelled</Text>

            {/* Description */}
            <Text style={styles.description}>
              Your payment was not completed. No charges were made and
              your order has not been processed.
            </Text>

            {/* Marketplace Safety Notice */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>What happens next?</Text>
              <Text style={styles.infoText}>
                • Your order was not finalized{"\n"}
                • No funds were captured{"\n"}
                • You can safely retry checkout anytime
              </Text>
            </View>

            {/* Retry Checkout */}
            {orderId && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() =>
                  router.replace({
                    pathname: "/checkout/final",
                    params: { orderId },
                  })
                }
              >
                <Ionicons name="card-outline" size={18} color="#fff" />
                <Text style={styles.retryText}>Retry Payment</Text>
              </TouchableOpacity>
            )}

            {/* Back to Home */}
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.homeText}>Return to Home</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1E1E1E",
    marginBottom: 10,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    fontWeight: "500",
  },
  infoBox: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 28,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1E1E1E",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    fontWeight: "600",
  },
  retryButton: {
    width: "100%",
    height: 54,
    borderRadius: 28,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#7FAF9B",
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
    marginBottom: 14,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  homeButton: {
    paddingVertical: 14,
  },
  homeText: {
    color: "#7FAF9B",
    fontSize: 15,
    fontWeight: "800",
  },
})