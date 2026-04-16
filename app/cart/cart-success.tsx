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

export default function CartCheckoutSuccessScreen() {
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
          name="checkmark-circle"
          size={88}
          color="#22C55E"
          style={styles.icon}
        />

        <Text style={styles.title}>
          Order Successful
        </Text>

        <Text style={styles.sub}>
          Your payment was successful and your
          orders are now secured in escrow.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            router.replace("/orders")
          }
        >
          <Text style={styles.primaryBtnText}>
            View Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() =>
            router.replace("/home")
          }
        >
          <Text style={styles.secondaryBtnText}>
            Continue Shopping
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