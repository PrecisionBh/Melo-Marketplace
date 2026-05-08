import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export default function ProfileQuickActions() {
  const router = useRouter()

  return (
    <View style={styles.row}>
      {/* BOOKKEEPING */}
      <TouchableOpacity
        style={styles.fullCard}
        activeOpacity={0.85}
        onPress={() => router.push("/bookkeeping")}
      >
        <View style={styles.left}>
          <View style={styles.iconBubble}>
            <Ionicons
              name="book-outline"
              size={22}
              color="#111827"
            />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Bookkeeping</Text>
            <Text style={styles.sub}>
              Track sales, earnings, payouts, and business activity.
            </Text>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color="#6B7280"
        />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    marginTop: 24,
  },

  fullCard: {
    width: "100%",
    backgroundColor: "#F8F1EA",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E9D6C7",
    padding: 20,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 12,
  },

  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F3E4D8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  content: {
    flex: 1,
  },

  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  sub: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },
})