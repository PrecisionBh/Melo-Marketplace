import { Ionicons } from "@expo/vector-icons"
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

type Props = {
  category: string | null
  condition: string | null
  conditionSubtext?: string
  onPressCategory: () => void
  onPressCondition: () => void

  // 👇 NEW
  size?: string | null
  setSize?: (val: string) => void

  quantity?: string
  setQuantity?: (val: string) => void
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

const SIZES = ["XS","S","M","L","XL","2XL","3XL","4XL","5XL"]

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
  size,
  setSize,
  quantity,
  setQuantity,
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

      {/* 👕 SIZE (ONLY FOR APPAREL) */}
      {category === "clothing_apparel" && (
        <View style={styles.section}>
          <Text style={styles.label}>Size</Text>

          <View style={styles.sizeWrap}>
            {SIZES.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSize?.(s)}
                style={[
                  styles.sizePill,
                  size === s && styles.sizePillActive,
                ]}
              >
                <Text
                  style={[
                    styles.sizeText,
                    size === s && styles.sizeTextActive,
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 📦 QUANTITY (PRO ONLY) */}
      {isPro && (
        <View style={styles.section}>
          <Text style={styles.label}>Quantity</Text>

          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            style={styles.input}
            placeholder="Enter quantity"
          />
        </View>
      )}

      {/* 🔒 FREE USER NOTICE */}
      {!isPro && (
        <Text style={styles.lockedText}>
          Quantity limited to 1 on free plan
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

  /* 👕 SIZE */

  section: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 16,
  },

  sizeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  sizePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#eee",
  },

  sizePillActive: {
    backgroundColor: "#D97732",
  },

  sizeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
  },

  sizeTextActive: {
    color: "#fff",
  },

  /* 📦 QUANTITY */

  input: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },

  lockedText: {
    fontSize: 12,
    color: "#888",
    marginTop: 6,
  },
})