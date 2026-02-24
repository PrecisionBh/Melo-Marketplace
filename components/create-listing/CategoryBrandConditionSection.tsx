import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  category: string | null
  brand: string | null
  condition: string | null
  onPressCategory: () => void
  onPressBrand: () => void
  onPressCondition: () => void
}

/* 🔥 VALUE → LABEL FORMATTERS (PREMIUM UI FIX) */
const CATEGORY_LABEL_MAP: Record<string, string> = {
  playing_cue: "Playing Cues",
  custom_cue: "Custom Cues",
  break_cue: "Break Cues",
  jump_cue: "Jump Cues",
  shaft: "Shafts",
  case: "Cue Cases",
  chalk: "Chalk",
  gloves: "Gloves",
  apparel: "Apparel",
  accessories: "Accessories",
  collectibles: "Collectibles",
  other: "Other",
}

const CONDITION_LABEL_MAP: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
}

function formatCategory(value: string | null) {
  if (!value) return "Select a category"
  return CATEGORY_LABEL_MAP[value] || value
}

function formatCondition(value: string | null) {
  if (!value) return "Select condition"
  return CONDITION_LABEL_MAP[value] || value
}

function formatBrand(value: string | null) {
  if (!value) return "Select a brand"
  // Convert "predator" -> "Predator", "mcdermott" -> "Mcdermott"
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export default function CategoryBrandConditionSection({
  category,
  brand,
  condition,
  onPressCategory,
  onPressBrand,
  onPressCondition,
}: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.inner}>
        <Text style={styles.title}>Item Details</Text>
        <Text style={styles.subText}>
          Select category, brand, and condition.
        </Text>

        <View style={styles.divider} />

        {/* Category */}
        <Field
          label="Category *"
          value={formatCategory(category)}
          onPress={onPressCategory}
        />

        {/* Brand */}
        <Field
          label="Brand"
          value={formatBrand(brand)}
          onPress={onPressBrand}
        />

        {/* Condition */}
        <Field
          label="Condition *"
          value={formatCondition(condition)}
          onPress={onPressCondition}
        />
      </View>
    </View>
  )
}

function Field({
  label,
  value,
  onPress,
}: {
  label: string
  value: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={styles.field}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#7FAF9B" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  /* 🔥 MATCHES TITLE/DESCRIPTION SECTION */
  section: {
    marginHorizontal: -16, // full bleed (no edges)
    backgroundColor: "#FFFFFF", // clean builder look
  },

  inner: {
    paddingTop: 18,
    paddingBottom: 6,
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
    paddingHorizontal: 16,
    marginBottom: 2,
  },

  subText: {
    fontSize: 12,
    color: "#323232",
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  divider: {
    height: 1,
    backgroundColor: "#E6ECE8",
    width: "100%",
    marginBottom: 6,
  },

  field: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    fontSize: 12,
    color: "#6B6B6B",
    marginBottom: 2,
    fontWeight: "600",
  },

  value: {
    fontSize: 15,
    color: "#0F1E17",
    fontWeight: "700",
  },
})