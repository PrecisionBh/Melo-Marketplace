import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

type Props = {
  category: string | null
  condition: string | null
  conditionSubtext?: string
  onPressCategory: () => void
  onPressCondition: () => void
}

const CATEGORY_LABEL_MAP: Record<string, string> = {
  electronics: "Electronics",
  fashion: "Fashion",
  sports_outdoors: "Sports & Outdoors",
  home_garden: "Home & Garden",
  collectibles: "Collectibles",
  automotive: "Automotive",
  toys_games: "Toys & Games",
  baby_kids: "Baby & Kids",
  beauty_health: "Beauty & Health",
  tools: "Tools",
  music_instruments: "Music / Instruments",
  hobbies: "Hobbies",
  pet_supplies: "Pet Supplies",
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
  if (!value) return "Select category"
  return CATEGORY_LABEL_MAP[value] || value
}

function formatCondition(value: string | null) {
  if (!value) return "Select condition"
  return CONDITION_LABEL_MAP[value] || value
}

export default function CreateListingSelectors({
  category,
  condition,
  conditionSubtext,
  onPressCategory,
  onPressCondition,
}: Props) {
  return (
    <View style={styles.wrap}>
      <SelectorField
        label="Category"
        value={formatCategory(category)}
        onPress={onPressCategory}
      />

      <SelectorField
        label="Condition"
        value={formatCondition(condition)}
        subtext={conditionSubtext}
        onPress={onPressCondition}
      />
    </View>
  )
}

function SelectorField({
  label,
  value,
  subtext,
  onPress,
}: {
  label: string
  value: string
  subtext?: string
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

        {subtext && (
          <Text style={styles.subtext}>{subtext}</Text>
        )}
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#999"
      />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    gap: 12,
  },

  field: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },

  value: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },

  subtext: {
    fontSize: 12,
    color: "#777",
    marginTop: 3,
  },
})