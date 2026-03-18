import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect } from "react"
import { Alert, StyleSheet, Text, View } from "react-native"

import { supabase } from "@/lib/supabase"

export default function ShippingSuccess() {
  const router = useRouter()
  const { session_id, orderId, rateId } = useLocalSearchParams<{
    session_id: string
    orderId: string
    rateId: string
  }>()

  useEffect(() => {
    if (session_id && orderId && rateId) {
      handleSuccess()
    }
  }, [session_id, orderId, rateId])

  const handleSuccess = async () => {
    try {
      console.log("✅ Stripe success hit", { session_id, orderId })

      // 🔥 STEP 1: VERIFY PAYMENT + SAVE PAYMENT INTENT
      const { data: verifyData, error: verifyError } =
        await supabase.functions.invoke("verify-shipping-payment", {
          body: {
            sessionId: session_id,
            orderId,
          },
        })

      if (verifyError) throw verifyError

      console.log("💰 Payment verified")

      // 🔥 STEP 2: BUY LABEL
      const { data: labelData, error: labelError } =
        await supabase.functions.invoke("buy-shippo-label", {
          body: {
            orderId,
            rateId,
          },
        })

      if (labelError) throw labelError

      console.log("📦 Label created")

      Alert.alert("Success", "Shipping label created successfully!")

      router.replace("/seller-hub/orders/orders-to-ship")
    } catch (err) {
      console.error("❌ shipping success error:", err)

      Alert.alert(
        "Error",
        "Payment went through, but label creation failed. Please try again."
      )

      router.replace("/seller-hub/orders")
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Payment Successful ✅</Text>
      <Text style={styles.sub}>Creating your label...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 20,
    fontWeight: "600",
  },
  sub: {
    marginTop: 10,
    color: "#666",
  },
})