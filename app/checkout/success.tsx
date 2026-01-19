import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

export default function CheckoutSuccessScreen() {
  const router = useRouter()

  return (
    <View style={styles.screen}>
      {/* TOP SECTION */}
      <View style={styles.top}>
        <Ionicons
          name="checkmark-circle"
          size={84}
          color="#2E5F4F"
          style={{ marginBottom: 18 }}
        />

        <Text style={styles.title}>Order Confirmed</Text>
        <Text style={styles.subtitle}>
          Congrats! Your order has been placed successfully.
        </Text>
      </View>

      {/* RECEIPT */}
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
          Your payment has been confirmed and the seller has been notified.
        </Text>

        <Text style={styles.cardText}>
          You can track shipping, delivery, and status updates from your orders
          page at any time.
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
    backgroundColor: "#f1e9e9",
    paddingHorizontal: 24,
    paddingTop: 80,
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
