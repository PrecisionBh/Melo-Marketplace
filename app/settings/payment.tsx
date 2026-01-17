import { Ionicons } from "@expo/vector-icons"
import {
  initPaymentSheet,
  presentPaymentSheet,
} from "@stripe/stripe-react-native"
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
  const [card, setCard] = useState<{
    brand: string
    last4: string
  } | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user) return
    loadProfile()
  }, [session])

  /* ---------------- LOAD PROFILE ---------------- */

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("stripe_customer_id, card_brand, card_last4")
      .eq("id", session!.user.id)
      .single()

    if (data?.stripe_customer_id) {
      setCustomerId(data.stripe_customer_id)

      if (data.card_last4) {
        setCard({
          brand: data.card_brand,
          last4: data.card_last4,
        })
      }
    }
  }

  /* ---------------- ADD / CHANGE CARD ---------------- */

  const addOrChangeCard = async () => {
    if (!session?.user?.email) return

    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-setup-intent",
        {
          body: {
            user_id: session.user.id,
            email: session.user.email,
            stripe_customer_id: customerId,
          },
        }
      )

      if (error) throw error

      const {
        customerId: newCustomerId,
        ephemeralKey,
        setupIntentClientSecret,
      } = data

      /* ✅ FORCE MANUAL CARD ENTRY */
      const init = await initPaymentSheet({
        merchantDisplayName: "Melo Marketplace",

        customerId: newCustomerId,
        customerEphemeralKeySecret: ephemeralKey,
        setupIntentClientSecret,

        allowsDelayedPaymentMethods: false,

        defaultBillingDetails: {
          email: session.user.email,
        },
      })

      if (init.error) throw init.error

      const result = await presentPaymentSheet()
      if (result.error) throw result.error

      await supabase
        .from("profiles")
        .update({
          stripe_customer_id: newCustomerId,
        })
        .eq("id", session.user.id)

      await loadProfile()

      Alert.alert("Success", "Payment method saved.")
    } catch (err: any) {
      Alert.alert(
        "Payment error",
        err?.message || "Unable to add payment method."
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
          name={card ? "checkmark-circle" : "card-outline"}
          size={44}
          color={card ? "#2E5F4F" : "#7FAF9B"}
        />

        <Text style={styles.title}>
          {card ? "Payment method on file" : "Add a payment method"}
        </Text>

        <Text style={styles.text}>
          {card
            ? `${card.brand.toUpperCase()} ending in ${card.last4}`
            : "A saved card is required to place orders or submit offers."}
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={addOrChangeCard}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading
              ? "Processing..."
              : card
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
