import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, View } from "react-native"

type Props = {
  boostsRemaining: number
  style?: any
}

export default function ProStatusCard({ boostsRemaining, style }: Props) {
  return (
    <View style={[styles.proCard, style]}>
      {/* Gold Glow Accent */}
      <View style={styles.glow} />

      <View style={styles.row}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="diamond" size={20} color="#FFD700" />
        </View>

        {/* Text */}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Melo Pro Active</Text>
          <Text style={styles.subtitle}>
            {boostsRemaining} Boost{boostsRemaining === 1 ? "" : "s"} Remaining • Priority Exposure
          </Text>
        </View>

        {/* Gold Status Pill */}
        <View style={styles.pill}>
          <Text style={styles.pillText}>PRO</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  /* 🔥 LUXURY PRO CARD (MATCHES UPGRADE BUTTON THEME) */
  proCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#0B1511",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.28)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  glow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#FFD700",
    opacity: 0.08,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,215,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },

  pill: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },

  pillText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0B1511",
    letterSpacing: 1,
  },
})