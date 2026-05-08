import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import {
  StyleSheet,
  Text,
  View,
} from "react-native"

export default function BoostBalanceCard({
  boostsRemaining,
}: {
  boostsRemaining: number
}) {
  return (
    <LinearGradient
      colors={[
        "#FFB347",
        "#FF8C42",
        "#FF6B00",
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.card}>
        <View style={styles.left}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="flash"
              size={18}
              color="#FF7A00"
            />
          </View>

          <View>
            <Text style={styles.label}>
              Boost Credits
            </Text>

            <Text style={styles.subLabel}>
              Push listings higher in the
              feed
            </Text>
          </View>
        </View>

        <Text style={styles.value}>
          {boostsRemaining}
        </Text>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 24,
    marginBottom: 18,

    shadowColor: "#FF7A00",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,

    elevation: 6,
  },

  card: {
    borderRadius: 24,

    paddingVertical: 16,
    paddingHorizontal: 18,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    backgroundColor:
      "rgba(255,255,255,0.08)",

    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.16)",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  iconWrap: {
    width: 44,
    height: 44,

    borderRadius: 14,

    backgroundColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 12,
  },

  label: {
    fontSize: 16,
    fontWeight: "900",

    color: "#111827",
  },

  subLabel: {
    fontSize: 12,

    color: "#1F2937",

    marginTop: 2,
  },

  value: {
    fontSize: 32,
    fontWeight: "900",

    color: "#111827",

    marginLeft: 14,
  },
})