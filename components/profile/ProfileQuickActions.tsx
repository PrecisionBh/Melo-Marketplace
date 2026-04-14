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
      {/* MELO PRO */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push("/melo-pro")}
      >
        <View style={styles.iconBubble}>
          <Ionicons
            name="diamond-outline"
            size={22}
            color="#D97732"
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Melo Pro</Text>
          <Text style={styles.sub}>1% fees • Unlimited</Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color="#6B7280"
        />
      </TouchableOpacity>

      {/* BOOKKEEPING */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push("/bookkeeping")}
      >
        <View style={styles.iconBubble}>
          <Ionicons
            name="book-outline"
            size={20}
            color="#111827"
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Bookkeeping</Text>
          <Text style={styles.sub}>Sales & earnings</Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color="#6B7280"
        />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 20,
    marginTop: 24,
  },

  card: {
    flex: 1,
    backgroundColor: "#F8F1EA",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E9D6C7",
    padding: 18,
    minHeight: 132,
    justifyContent: "space-between",
  },

  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3E4D8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  content: {
    flex: 1,
  },

  title: {
    fontSize: 16,
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