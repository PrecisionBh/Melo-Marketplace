import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, View } from "react-native"

type Props = {
  boostsRemaining: number
}

export default function ProHeroBanner({ boostsRemaining }: Props) {
  return (
    <View style={styles.hero}>
      {/* Glow Orb (same premium effect as Melo Pro page) */}
      <View style={styles.heroGlow} />

      {/* Top Row */}
      <View style={styles.topRow}>
        <View style={styles.brandPill}>
          <Ionicons name="sparkles" size={12} color="#0F1E17" />
          <Text style={styles.brandText}>MELO PRO</Text>
        </View>

        <View style={styles.boostPill}>
          <Text style={styles.boostPillText}>
            {boostsRemaining} Boosts
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>You’re Pro 👑</Text>
      <Text style={styles.subtitle}>
        Stay on top. Sell faster. Get seen first.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#0F1E17",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  heroGlow: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#7FAF9B",
    opacity: 0.35,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#BFE7D4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  brandText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: "900",
    color: "#0F1E17",
    letterSpacing: 1,
  },
  boostPill: {
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  boostPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  title: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
})