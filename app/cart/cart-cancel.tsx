import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import React, { useEffect } from "react"
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"
import { useCart } from "@/context/CartContext"

export default function CartCheckoutCancelScreen() {
  const router = useRouter()
  const { refreshCartCount } = useCart()

  useEffect(() => {
    refreshCartCount()
  }, [])

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <View style={styles.content}>
        <Ionicons
          name="close-circle"
          size={88}
          color="#EF4444"
          style={styles.icon}
        />

        <Text style={styles.title}>
          Checkout Canceled
        </Text>

        <Text style={styles.sub}>
          Your payment was not completed.
          Your cart has been saved so you can
          try again anytime.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            router.replace("/cart")
          }
        >
          <Text style={styles.primaryBtnText}>
            Return To Cart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() =>
            router.replace("/home")
          }
        >
          <Text style={styles.secondaryBtnText}>
            Back Home
          </Text>
        </TouchableOpacity>
      </View>

      <GlobalFooter />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 90,
  },

  icon: {
    marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginBottom: 12,
  },

  sub: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
  },

  primaryBtn: {
    width: "100%",
    backgroundColor: "#D97732",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  primaryBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },

  secondaryBtn: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#ECECEC",
  },

  secondaryBtnText: {
    color: "#111",
    fontSize: 15,
    fontWeight: "700",
  },
})