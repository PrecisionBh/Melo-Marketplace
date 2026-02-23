import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { supabase } from "@/lib/supabase"

export default function MeloProSuccessScreen() {
  const router = useRouter()
  const { user_id } = useLocalSearchParams()

  const [loading, setLoading] = useState(true)
  const [activated, setActivated] = useState(false)

  useEffect(() => {
    const activateMeloPro = async () => {
      console.log("🎉 [MELO PRO] Success page opened")
      console.log("👤 [MELO PRO] Deep link user_id:", user_id)

      if (!user_id || typeof user_id !== "string") {
        console.error("❌ [MELO PRO] Missing user_id in deep link")
        Alert.alert(
          "Activation Error",
          "We could not verify your subscription user ID."
        )
        setLoading(false)
        return
      }

      try {
        console.log("🔍 [MELO PRO] Checking current Pro status...")

        const { data: profile, error: fetchError } = await supabase
          .from("profiles")
          .select("is_pro")
          .eq("id", user_id)
          .single()

        if (fetchError) {
          console.error("❌ [MELO PRO] Fetch profile error:", fetchError)
          throw fetchError
        }

        // Prevent duplicate activation if user refreshes success page
        if (profile?.is_pro) {
          console.log("ℹ️ [MELO PRO] User already Pro — skipping activation")
          setActivated(true)
          setLoading(false)
          return
        }

        console.log("🚀 [MELO PRO] Activating Melo Pro in database...")

        const now = new Date().toISOString()

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            is_pro: true,
            boosts_remaining: 10,       // 👑 Initial monthly boost allocation
            last_boost_reset: now,      // 🧠 Anchor for your monthly reset job
          })
          .eq("id", user_id)

        if (updateError) {
          console.error("❌ [MELO PRO] Update error:", updateError)
          throw updateError
        }

        console.log("✅ [MELO PRO] User upgraded to Pro with 10 boosts")

        // 🔔 Matches your existing notification insert style EXACTLY
        console.log("🔔 [MELO PRO] Sending notification...")

        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: user_id,
            type: "order", // Enum-safe (matches your schema)
            title: "Welcome to Melo Pro 🎉",
            body:
              "Congratulations! You are now a Melo Pro member. Your monthly boosts have been set to 10.",
            data: {
              route: "/melo-pro",
            },
          })

        if (notificationError) {
          console.error(
            "⚠️ [MELO PRO] Notification insert failed:",
            notificationError
          )
          // Do NOT throw — activation already succeeded
        } else {
          console.log("🔔 [MELO PRO] Notification sent successfully")
        }

        setActivated(true)
      } catch (err: any) {
        console.error("🚨 [MELO PRO] Activation crash:", err)
        Alert.alert(
          "Subscription Confirmed",
          "Your payment was successful, but activation is finalizing. Please reopen the Melo Pro page."
        )
      } finally {
        setLoading(false)
      }
    }

    activateMeloPro()
  }, [user_id])

  return (
    <View style={styles.screen}>
      <AppHeader title="Melo Pro Activated" backLabel="Home" backRoute="/" />

      <View style={styles.card}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color="#7FAF9B" />
            <Text style={styles.loadingText}>
              Activating your Melo Pro membership...
            </Text>
          </>
        ) : activated ? (
          <>
            <Ionicons name="sparkles" size={52} color="#7FAF9B" />

            <Text style={styles.title}>🎉 You’re Now Melo Pro!</Text>

            <Text style={styles.sub}>
              Your subscription is active. You now have unlimited listings,
              quantity selling, and 10 monthly boosts that reset every month.
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace("/melo-pro")}
            >
              <Text style={styles.primaryText}>
                Go to Melo Pro Dashboard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.secondaryText}>
                Back to Marketplace
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
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
    padding: 22,
    borderWidth: 1,
    borderColor: "#E6EFEA",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F1E17",
  },
  title: {
    marginTop: 18,
    fontSize: 24,
    fontWeight: "900",
    color: "#0F1E17",
    textAlign: "center",
  },
  sub: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E35",
    textAlign: "center",
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 22,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#7FAF9B",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  primaryText: {
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