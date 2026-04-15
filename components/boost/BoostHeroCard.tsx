import { Ionicons } from "@expo/vector-icons"
import {
    StyleSheet,
    Text,
    View,
} from "react-native"

export default function BoostHeroCard() {
  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        <Ionicons
          name="flash"
          size={14}
          color="#D97732"
        />
        <Text style={styles.pillText}>
          Boost Credits
        </Text>
      </View>

      <Text style={styles.title}>
        Get More Eyes on
      </Text>

      <Text style={styles.titleAccent}>
        Your Listings
      </Text>

      <Text style={styles.sub}>
        Buy credits once and use them
        whenever you want.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 12,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 16,
  },

  pillText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#D97732",
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    lineHeight: 34,
  },

  titleAccent: {
    fontSize: 30,
    fontWeight: "900",
    color: "#D97732",
    textAlign: "center",
    lineHeight: 34,
  },

  sub: {
    marginTop: 10,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
})