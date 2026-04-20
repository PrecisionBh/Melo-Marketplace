import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  isPro: boolean
}

export default function ProQuickActions({ isPro }: Props) {
  const router = useRouter()

  const handlePressPayoutHistory = () => {
    if (!isPro) {
      router.push("/melo-pro")
      return
    }
    router.push("/payout-history")
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Pro Tools</Text>

        {!isPro && (
          <View style={styles.proPill}>
            <Text style={styles.proPillText}>PRO</Text>
          </View>
        )}
      </View>

      {/* Payout History */}
      <TouchableOpacity
        style={[styles.row, !isPro && styles.rowLocked]}
        activeOpacity={0.7}
        onPress={handlePressPayoutHistory}
      >
        <View style={styles.left}>
          <View style={styles.iconWrap}>
            <Ionicons name="wallet-outline" size={18} color="#0F1E17" />
          </View>

          <View>
            <Text style={styles.label}>Payout History</Text>
            {!isPro && <Text style={styles.lockHint}>Upgrade to unlock</Text>}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#0F1E17" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#E6EFEA",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
  },

  proPill: {
    marginLeft: "auto",
    backgroundColor: "#CFAF4A",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  proPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#0F1E17",
  },

  row: {
    height: 56,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowLocked: {
    opacity: 0.45,
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EAF4EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F1E17",
  },

  lockHint: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: "#6B8F7D",
  },
})