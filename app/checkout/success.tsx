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

import { supabase } from "@/lib/supabase"
import { handleAppError } from "../../lib/errors/appError"

export default function CheckoutSuccessScreen() {
  const router = useRouter()
  const { orderId } = useLocalSearchParams<{ orderId?: string }>()

  const [verifying, setVerifying] = useState(true)
  const [isPaid, setIsPaid] = useState(false)
  const [orderNotFound, setOrderNotFound] = useState(false)

  useEffect(() => {
    const verifyOrder = async () => {
      try {
        // No orderId = still allow success UI (fallback safe)
        if (!orderId) {
          setVerifying(false)
          return
        }

        const { data, error } = await supabase
          .from("orders")
          .select("status")
          .eq("id", orderId)
          .single()

        if (error) {
          handleAppError(error, {
            fallbackMessage: "Unable to verify payment status.",
          })
          setVerifying(false)
          return
        }

        if (!data) {
          setOrderNotFound(true)
          setVerifying(false)
          return
        }

        // Stripe webhook may mark as paid or completed
        if (data.status === "paid" || data.status === "completed") {
          setIsPaid(true)
        }

        setVerifying(false)
      } catch (err) {
        handleAppError(err, {
          fallbackMessage: "Payment verification failed. Please check your orders.",
        })
        setVerifying(false)
      }
    }

    verifyOrder()
  }, [orderId])

  /* ---------------- LOADING (WEBHOOK SAFE) ---------------- */
  if (verifying) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" style={{ marginTop: 120 }} />
        <Text style={styles.verifyingText}>Verifying payment...</Text>
      </View>
    )
  }

  /* ---------------- ORDER NOT FOUND (EDGE CASE) ---------------- */
  if (orderNotFound) {
    return (
      <View style={styles.screen}>
        <View style={styles.top}>
          <Ionicons
            name="alert-circle-outline"
            size={84}
            color="#EB5757"
            style={{ marginBottom: 18 }}
          />

          <Text style={styles.title}>Order Not Found</Text>
          <Text style={styles.subtitle}>
            We couldn’t locate your order. If you were charged, please contact support.
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
            <Text style={styles.secondaryText}>Continue Browsing</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  /* ---------------- SUCCESS SCREEN ---------------- */
  return (
    <View style={styles.screen}>
      {/* TOP SECTION */}
      <View style={styles.top}>
        <Ionicons
          name={isPaid ? "checkmark-circle" : "time-outline"}
          size={84}
          color={isPaid ? "#2E5F4F" : "#F2C94C"}
          style={{ marginBottom: 18 }}
        />

        <Text style={styles.title}>
          {isPaid ? "Order Confirmed" : "Payment Processing"}
        </Text>

        <Text style={styles.subtitle}>
          {isPaid
            ? "Your payment is secured in escrow and the seller has been notified."
            : "Your payment is processing. This can take a few seconds to confirm."}
        </Text>
      </View>

      {/* RECEIPT CARD */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Ionicons
            name="receipt-outline"
            size={20}
            color="#2E5F4F"
          />
          <Text style={styles.cardTitle}>What happens next?</Text>
        </View>

        <Text style={styles.cardText}>
          The seller has been notified and will prepare your order for shipment.
        </Text>

        <Text style={styles.cardText}>
          You can track shipping, delivery, and status updates from your Orders page at any time.
        </Text>

        <Text style={styles.cardText}>
          Your payment remains protected in escrow until delivery is confirmed.
        </Text>
      </View>

      {/* ACTIONS */}
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
          <Text style={styles.secondaryText}>Continue Browsing</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
    paddingHorizontal: 24,
    paddingTop: 80,
  },

  verifyingText: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#2E5F4F",
  },

  top: {
    alignItems: "center",
    marginBottom: 28,
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
    marginBottom: 28,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F1E17",
  },

  cardText: {
    fontSize: 13,
    color: "#6B8F7D",
    lineHeight: 18,
    marginBottom: 8,
  },

  actions: {
    gap: 12,
  },

  primaryBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: "#0F1E17",
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
    borderColor: "#0F1E17",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryText: {
    color: "#0F1E17",
    fontWeight: "800",
    fontSize: 14,
  },
})
