import { Ionicons } from "@expo/vector-icons"
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

type SizeItem = {
  size: string
  qty: string
}

type Props = {
  category: string | null
  condition: string | null
  conditionSubtext?: string
  onPressCategory: () => void
  onPressCondition: () => void

  // 🔥 NEW SIZE SYSTEM
  sizes: SizeItem[]
  setSizes: (val: SizeItem[]) => void

  isPro?: boolean
}

const CATEGORY_LABEL_MAP: Record<string, string> = {
  electronics: "Electronics",
  clothing_apparel: "Clothing / Apparel",
  home_garden: "Home & Garden",
  sports_outdoors: "Sports & Outdoors",
  collectibles: "Collectibles",
  automotive: "Automotive",
  toys_games: "Toys & Games",
  baby_kids: "Baby & Kids",
  beauty_health: "Beauty & Health",
  tools: "Tools",
  music_instruments: "Music / Instruments",
  pet_supplies: "Pet Supplies",
  books_media: "Books & Media",
  office_supplies: "Office Supplies",
  art_handmade: "Art & Handmade",
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
  sizes,
  setSizes,
  isPro,
}: Props) {
  return (
    <View style={styles.wrap}>
      {/* CATEGORY */}
      <SelectorField
        label="Category"
        value={formatCategory(category)}
        onPress={onPressCategory}
      />

      {/* CONDITION */}
      <SelectorField
        label="Condition"
        value={formatCondition(condition)}
        subtext={conditionSubtext}
        onPress={onPressCondition}
      />

      {/* 👕 SIZE + QTY SYSTEM */}
      {category === "clothing_apparel" && (
        <View style={styles.section}>
          <Text style={styles.label}>Sizes & Quantity *</Text>

          {sizes.map((item, index) => (
            <View key={item.size} style={styles.sizeRow}>
              {/* SIZE LABEL */}
              <Text style={styles.sizeLabel}>{item.size}</Text>

              {/* QTY INPUT */}
              <TextInput
  style={styles.qtyInput}
  value={item.qty}
  onChangeText={(val) => {
    const updated = sizes.map((item, i) =>
      i === index
        ? { ...item, qty: val }
        : item
    )

    setSizes(updated)
  }}
  keyboardType="number-pad"
  placeholder="0"
  placeholderTextColor="#000"
/>
            </View>
          ))}

          <Text style={styles.helper}>
            Enter quantity for each size you want to sell
          </Text>
        </View>
      )}

      {/* 🔒 FREE USER NOTICE */}
      {!isPro && (
        <Text style={styles.lockedText}>
          Quantity controlled per size
        </Text>
      )}
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

      <Ionicons name="chevron-forward" size={18} color="#999" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    marginBottom: 18, // 🔥 added
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

  section: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 16,
  },

  sizeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  sizeLabel: {
    width: 40,
    fontWeight: "700",
    color: "#000",
  },

  qtyInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    color: "#000", // 🔥 iPHONE FIX
    fontSize: 14,
  },

  helper: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
  },

  lockedText: {
    fontSize: 12,
    color: "#888",
    marginTop: 6,
  },
})