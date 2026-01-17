import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

export default function BuyerDisputesScreen() {
  const router = useRouter()

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#E8F5EE" />
          <Text style={styles.backText}>My Orders</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Disputes</Text>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <Ionicons name="help-circle-outline" size={48} color="#7FAF9B" />

        <Text style={styles.title}>No Disputes Yet</Text>

        <Text style={styles.subtitle}>
          If you’ve opened a dispute on an order, you’ll be able
          to track its progress and resolution here.
        </Text>

        <Text style={styles.note}>
          (Buyer dispute tracking coming next)
        </Text>
      </View>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

  header: {
    paddingTop: 60,
    paddingBottom: 14,
    alignItems: "center",
    backgroundColor: "#7FAF9B",
  },

  backBtn: {
    position: "absolute",
    left: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  backText: {
    marginLeft: 6,
    color: "#E8F5EE",
    fontWeight: "600",
    fontSize: 13,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#E8F5EE",
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  title: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B8F7D",
    textAlign: "center",
    lineHeight: 20,
  },

  note: {
    marginTop: 14,
    fontSize: 12,
    color: "#9FB8AC",
    fontStyle: "italic",
  },
})
