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

export default function ProFeaturesSection({
  isPro,
  boostsRemaining,
  isBoosted,
  setIsBoosted,
  quantity,
  setQuantity,
}: Props) {
  const disabled = !isPro

  return (
    <View style={styles.section}>
      <View style={[styles.inner, disabled && styles.disabledInner]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Pro Features</Text>

          {!isPro && (
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>

        <Text style={styles.subText}>
          Boost your listing and set available quantity. Pro members only.
        </Text>

        <View style={styles.divider} />

        {/* BOOST TOGGLE */}
        <View style={styles.field}>
          <View style={styles.fieldTextWrap}>
            <View style={styles.boostTitleRow}>
              <Text style={styles.label}>Boost Listing</Text>

              {/* 🔥 Boosts Remaining (Pro UX) */}
              <Text
                style={[
                  styles.boostsRemaining,
                  !isPro && styles.boostsRemainingDisabled,
                ]}
              >
                {isPro ? `${boostsRemaining} boosts left` : "Pro only"}
              </Text>
            </View>

            <Text style={styles.helper}>
              Keeps listing closer to the top on the home page.
            </Text>
          </View>

          <Switch
            value={isBoosted}
            onValueChange={setIsBoosted}
            disabled={disabled}
            trackColor={{ false: "#DADADA", true: "#7FAF9B" }}
            thumbColor={isBoosted ? "#0F1E17" : "#FFFFFF"}
          />
        </View>

        {/* QUANTITY SELECTOR */}
        <View style={styles.field}>
          <View style={styles.fieldTextWrap}>
            <Text style={styles.label}>Quantity</Text>
            <Text style={styles.helper}>
              Set how many units of this item you have available.
            </Text>
          </View>

          <TextInput
            style={[
              styles.quantityInput,
              disabled && styles.disabledInput,
            ]}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            editable={!disabled}
            placeholder="1"
            placeholderTextColor="#A0A0A0"
          />
        </View>

        {/* Locked Overlay Text (subtle) */}
        {!isPro && (
          <View style={styles.lockNotice}>
            <Ionicons name="lock-closed" size={14} color="#6B6B6B" />
            <Text style={styles.lockText}>
              Upgrade to Pro to unlock boosting & quantity listings
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  /* FULL BLEED - matches your builder system */
  section: {
    marginHorizontal: -16,
    backgroundColor: "#FFFFFF",
  },

  inner: {
    paddingTop: 18,
    paddingBottom: 12,
  },

  /* Gray overlay effect when not Pro */
  disabledInner: {
    opacity: 0.6,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 2,
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
  },

  proBadge: {
    backgroundColor: "#0F1E17",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },

  proBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  subText: {
    fontSize: 12,
    color: "#323232", // your preferred subtext color
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  divider: {
    height: 1,
    backgroundColor: "#ECECEC",
    width: "100%",
    marginBottom: 6,
  },

  field: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  fieldTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  boostTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F1E17",
  },

  boostsRemaining: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7FAF9B", // Melo accent
  },

  boostsRemainingDisabled: {
    color: "#A0A0A0",
  },

  helper: {
    fontSize: 12,
    color: "#6B6B6B",
  },

  quantityInput: {
    width: 70,
    height: 42,
    borderWidth: 1,
    borderColor: "#DADADA",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#0F1E17",
    backgroundColor: "#F8F8F8",
  },

  disabledInput: {
    backgroundColor: "#EFEFEF",
  },

  lockNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  lockText: {
    fontSize: 12,
    color: "#6B6B6B",
    fontWeight: "500",
  },
})