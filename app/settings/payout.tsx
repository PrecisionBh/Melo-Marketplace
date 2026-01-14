import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

export default function PayoutPlaceholder() {
  const router = useRouter()

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payouts</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.card}>
        <Ionicons name="cash-outline" size={40} color="#7FAF9B" />
        <Text style={styles.title}>Payout setup coming soon</Text>
        <Text style={styles.text}>
          Seller payouts will be handled securely through trusted payment
          providers. Melo never stores bank account or routing information.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },
  header: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },
  card: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  title: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
  },
  text: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 13,
    color: "#6B8F7D",
    lineHeight: 18,
  },
})
