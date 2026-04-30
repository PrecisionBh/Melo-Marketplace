import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
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
  subcategory: string | null
  condition: string | null
  conditionSubtext?: string
  onPressCategory: () => void
  onPressSubcategory: () => void
  onPressCondition: () => void
  sizes: SizeItem[]
  setSizes: (val: SizeItem[]) => void
  isPro?: boolean
}


const CATEGORY_LABEL_MAP: Record<string, string> = {
  electronics: "Electronics",
  clothing_apparel: "Clothing / Apparel",
  jewelry_watches: "Jewelry & Watches",
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

function formatSubcategory(value: string | null) {
  if (!value) return "Select type"

  const map: Record<string, string> = {
    tops: "Tops",
    bottoms: "Bottoms",
    dresses: "Dresses",
    shoes: "Shoes",
    accessories: "Accessories",
    watches: "Watches",
    rings: "Rings",
    necklaces: "Necklaces",
    bracelets: "Bracelets",
    earrings: "Earrings",
  }

  return map[value] || value
  
}

export default function CreateListingSelectors({
  category,
  subcategory,
  condition,
  conditionSubtext,
  onPressCategory,
  onPressSubcategory,
  onPressCondition,
  sizes,
  setSizes,
  isPro,
}: Props) {
  const [customSize, setCustomSize] = useState("")
  const [customQty, setCustomQty] = useState("")

  return (
    <View style={styles.wrap}>
      <SelectorField
        label="Category"
        value={formatCategory(category)}
        onPress={onPressCategory}
      />

      {(category === "clothing_apparel" ||
        category === "jewelry_watches") && (
        <SelectorField
          label="Type"
          value={formatSubcategory(subcategory)}
          onPress={onPressSubcategory}
        />
      )}

      <SelectorField
        label="Condition"
        value={formatCondition(condition)}
        subtext={conditionSubtext}
        onPress={onPressCondition}
      />

      {category === "clothing_apparel" &&
        subcategory &&
        sizes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Sizes & Quantity *</Text>

            {sizes.map((item, index) => (
              <View key={item.size} style={styles.sizeRow}>
                <Text style={styles.sizeLabel}>{item.size}</Text>

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

            {/* 🔥 CUSTOM SIZE INPUT */}
           {/* 🔥 CUSTOM SIZE INPUT (WITH QTY) */}
<View style={{ marginTop: 12 }}>
  <Text style={styles.label}>Add Custom Size</Text>

  <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
    
    {/* SIZE INPUT */}
    <TextInput
      style={[styles.qtyInput, { flex: 2 }]}
      placeholder="Size (e.g. 36x34)"
      value={customSize}
      onChangeText={setCustomSize}
      placeholderTextColor="#888"
    />

    {/* QTY INPUT */}
    <TextInput
      style={[styles.qtyInput, { width: 70 }]}
      placeholder="Qty"
      value={customQty}
      onChangeText={setCustomQty}
      keyboardType="number-pad"
      placeholderTextColor="#888"
    />

    {/* ADD BUTTON */}
    <TouchableOpacity
      onPress={() => {
        if (!customSize.trim()) return
        if (!customQty || parseInt(customQty) <= 0) return

        const exists = sizes.some(
          (s) =>
            s.size.toLowerCase() ===
            customSize.toLowerCase()
        )

        if (exists) {
          setCustomSize("")
          setCustomQty("")
          return
        }

        setSizes([
          ...sizes,
          {
            size: customSize.trim().toUpperCase(),
            qty: customQty,
          },
        ])

        setCustomSize("")
        setCustomQty("")
      }}
      style={{
        backgroundColor: "#D97732",
        paddingHorizontal: 12,
        justifyContent: "center",
        borderRadius: 10,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "700" }}>
        Add
      </Text>
    </TouchableOpacity>
  </View>
</View>
          </View>
        )}

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
    marginBottom: 18,
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
    color: "#000",
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