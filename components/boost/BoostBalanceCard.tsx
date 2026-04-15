import { Ionicons } from "@expo/vector-icons"
import {
    StyleSheet,
    Text,
    View,
} from "react-native"

export default function BoostBalanceCard({
  boostsRemaining,
  megaRemaining,
}: {
  boostsRemaining: number
  megaRemaining: number
}) {
  return (
    <View style={styles.row}>
      <View style={styles.boostCard}>
        <View style={styles.labelRow}>
          <Ionicons
            name="flash"
            size={14}
            color="#D97732"
          />
          <Text style={styles.boostLabel}>
            Boost Credits
          </Text>
        </View>

        <Text style={styles.boostValue}>
          {boostsRemaining}
        </Text>
      </View>

      <View style={styles.megaCard}>
        <View style={styles.labelRow}>
          <Ionicons
            name="rocket"
            size={14}
            color="#9333EA"
          />
          <Text style={styles.megaLabel}>
            Mega Boosts
          </Text>
        </View>

        <Text style={styles.megaValue}>
          {megaRemaining}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },

  boostCard: {
    flex: 1,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 22,
    padding: 16,
  },

  megaCard: {
    flex: 1,
    backgroundColor: "#FAF5FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 22,
    padding: 16,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },

  boostLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C2410C",
  },

  megaLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7E22CE",
  },

  boostValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#D97732",
  },

  megaValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#9333EA",
  },
})