import { Ionicons } from "@expo/vector-icons"
import * as Linking from "expo-linking"
import { useRouter } from "expo-router"
import { useState } from "react"
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

export default function MeloProCheckoutScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    console.log("🚀 [MELO PRO] Subscribe button clicked")

    if (!session?.user?.id || !session.user.email) {
      console.log("❌ [MELO PRO] No session user found", {
        userId: session?.user?.id,
        email: session?.user?.email,
      })
      Alert.alert("Sign in required", "Please log in to upgrade to Melo Pro.")
      router.push("/login")
      return
    }

    console.log("✅ [MELO PRO] User validated:", {
      user_id: session.user.id,
      email: session.user.email,
    })

    setLoading(true)
    console.log("⏳ [MELO PRO] Loading state set to TRUE")

    try {
      console.log("📡 [MELO PRO] Invoking edge function: create-pro-checkout-session")

      const startTime = Date.now()

      const { data, error } = await supabase.functions.invoke(
        "create-pro-checkout-session",
        {
          body: {
            user_id: session.user.id,
            email: session.user.email,
          },
        }
      )

      const endTime = Date.now()
      console.log("🕒 [MELO PRO] Function response time:", endTime - startTime, "ms")

      console.log("📦 [MELO PRO] Raw function response:", {
        data,
        error,
      })

      if (error) {
        console.error("❌ [MELO PRO] Edge function error:", error)
        throw error
      }

      if (!data) {
        console.error("❌ [MELO PRO] No data returned from function")
        throw new Error("No response from checkout function.")
      }

      if (!data?.url) {
        console.error("❌ [MELO PRO] Missing checkout URL:", data)
        throw new Error("Stripe session failed to return a checkout URL.")
      }

      console.log("💳 [MELO PRO] Stripe Checkout URL received:", data.url)

      const canOpen = await Linking.canOpenURL(data.url)
      console.log("🔗 [MELO PRO] Can open URL:", canOpen)

      if (!canOpen) {
        console.error("❌ [MELO PRO] Cannot open Stripe URL:", data.url)
        throw new Error("Unable to open Stripe checkout URL.")
      }

      console.log("🌍 [MELO PRO] Redirecting to Stripe checkout...")
      await Linking.openURL(data.url)
      console.log("✅ [MELO PRO] Linking.openURL executed")
    } catch (err: any) {
      console.error("🚨 [MELO PRO] Checkout crash:", err)
      handleAppError(err, {
        fallbackMessage:
          err?.message ?? "Unable to start Melo Pro subscription checkout.",
      })
    } finally {
      console.log("🔚 [MELO PRO] Finally block hit — stopping loader")
      setLoading(false)
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Melo Pro" backLabel="Back" backRoute="/melo-pro" />

      <View style={styles.card}>
        <Ionicons name="sparkles" size={24} color="#0F1E17" />

        <Text style={styles.title}>Upgrade to Melo Pro</Text>

        <Text style={styles.sub}>
          Unlock unlimited listings, monthly boosts, quantity selling, and
          premium seller tools designed to help you get more visibility and
          close more sales.
        </Text>

        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>Melo Pro</Text>
          <Text style={styles.price}>$10 / month</Text>
          <Text style={styles.priceSub}>Cancel anytime</Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.7 }]}
          onPress={handleSubscribe}
          activeOpacity={0.9}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0F1E17" />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={18} color="#0F1E17" />
              <Text style={styles.btnText}>Start Melo Pro Subscription</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push("/melo-pro")}
          disabled={loading}
        >
          <Text style={styles.secondaryText}>Back to Melo Pro</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },
  card: {
    margin: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E6EFEA",
    alignItems: "center",
  },
  title: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "900",
    color: "#0F1E17",
  },
  sub: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#2C3E35",
    opacity: 0.9,
    lineHeight: 18,
    textAlign: "center",
  },
  priceBox: {
    marginTop: 16,
    backgroundColor: "#EAF4EF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#DCEAE3",
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F1E17",
    opacity: 0.7,
  },
  price: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "900",
    color: "#0F1E17",
  },
  priceSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: "#0F1E17",
    opacity: 0.6,
  },
  btn: {
    marginTop: 18,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#7FAF9B", // Melo header color aligned with your theme
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F1E17",
  },
  secondaryBtn: {
    marginTop: 10,
    paddingVertical: 10,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F1E17",
    opacity: 0.7,
  },
})