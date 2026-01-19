import { Ionicons } from "@expo/vector-icons"
import * as Linking from "expo-linking"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "../../context/AuthContext"
import { supabase } from "../../lib/supabase"

export default function PaymentMethodsScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [loading, setLoading] = useState(false)
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false)

  /* ---------------- LOAD PROFILE ---------------- */

  useEffect(() => {
    if (!session?.user) return
    loadProfile()
  }, [session])

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("has_payment_method")
        .eq("id", session!.user.id)
        .single()

      if (error) {
        console.warn("Profile load error:", error.message)
        setHasPaymentMethod(false)
        return
      }

      setHasPaymentMethod(!!data?.has_payment_method)
    } catch {
      setHasPaymentMethod(false)
    }
  }

  /* ---------------- ADD / CHANGE CARD ---------------- */

  const addOrChangeCard = async () => {
    if (!session?.user) return

    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-payment-setup",
        {
          body: {
            user_id: session.user.id,
            email: session.user.email,
          },
        }
      )

      if (error || !data?.url) {
        throw error || new Error("No Stripe URL returned")
      }

      // 🚀 OPEN STRIPE HOSTED SETUP PAGE
      await Linking.openURL(data.url)
    } catch (err: any) {
      Alert.alert(
        "Payment error",
        err?.message || "Unable to open Stripe"
      )
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push("/settings")}
          >
            <Ionicons name="arrow-back" size={22} color="#0F1E17" />
            <Text style={styles.headerSub}>Settings</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Payment Methods</Text>

          <View style={{ width: 60 }} />
        </View>
      </View>

      {/* CARD */}
      <View style={styles.card}>
        <Ionicons
          name={hasPaymentMethod ? "checkmark-circle" : "card-outline"}
          size={44}
          color={hasPaymentMethod ? "#2E5F4F" : "#7FAF9B"}
        />

        <Text style={styles.title}>
          {hasPaymentMethod
            ? "Payment method on file"
            : "No payment method added"}
        </Text>

        <Text style={styles.text}>
          {hasPaymentMethod
            ? "You’re ready to place orders and submit offers."
            : "Add a payment method to continue."}
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={addOrChangeCard}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading
              ? "Processing..."
              : hasPaymentMethod
              ? "Change payment method"
              : "Add payment method"}
          </Text>
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
  },

  headerWrap: {
    backgroundColor: "#7FAF9B",
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  headerBtn: {
    alignItems: "center",
    minWidth: 60,
  },

  headerSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#0F1E17",
  },

  card: {
    margin: 20,
    padding: 26,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },

  title: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
    textAlign: "center",
  },

  text: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 13,
    color: "#6B8F7D",
    lineHeight: 18,
  },

  button: {
    marginTop: 22,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 26,
    backgroundColor: "#0F1E17",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
})
