import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Switch, Text, TextInput, View } from "react-native"

type Props = {
  isPro: boolean
  boostsRemaining: number
  isBoosted: boolean
  setIsBoosted: (v: boolean) => void
  quantity: string
  setQuantity: (v: string) => void
}

export default function ProFeaturesCard({
  isPro,
  boostsRemaining,
  isBoosted,
  setIsBoosted,
  quantity,
  setQuantity,
}: Props) {
  return (
    <View style={[styles.container, !isPro && styles.locked]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Ionicons name="sparkles" size={18} color="#CFAF4A" />
        <Text style={styles.title}>Melo Pro Features</Text>

        {!isPro && (
          <View style={styles.proPill}>
            <Text style={styles.proPillText}>PRO</Text>
          </View>
        )}
      </View>

      {/* Subtext */}
      <Text style={styles.subtitle}>
        {isPro
          ? `Boosts remaining: ${boostsRemaining}`
          : "Upgrade to Melo Pro to unlock boosted listings & quantity selling"}
      </Text>

      {/* Boost Toggle */}
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>Boost Listing</Text>
          <Text style={styles.hint}>
            Priority placement in search & feeds
          </Text>
        </View>

        <Switch
          value={isBoosted}
          onValueChange={setIsBoosted}
          disabled={!isPro || boostsRemaining <= 0}
          trackColor={{ false: "#D6E6DE", true: "#7FAF9B" }}
        />
      </View>

      {/* Quantity */}
      <View style={styles.field}>
        <Text style={styles.label}>Quantity (Pro Only)</Text>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          editable={isPro}
          placeholder="1"
          placeholderTextColor="#9BB7AA"
          style={[
            styles.input,
            !isPro && styles.inputDisabled,
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F1F8F5", // LIGHT MELO THEME (NOT DARK)
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#D6E6DE",
  },
  locked: {
    opacity: 0.7,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    color: "#2E5F4F",
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
  subtitle: {
    fontSize: 12,
    color: "#5F8F7F",
    marginBottom: 14,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2E5F4F",
  },
  hint: {
    fontSize: 11,
    color: "#7A9C8F",
    marginTop: 2,
  },
  field: {
    marginTop: 4,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#D6E6DE",
    color: "#1F3D33",
    fontSize: 15,
    marginTop: 6,
  },
  inputDisabled: {
    opacity: 0.5,
  },
})