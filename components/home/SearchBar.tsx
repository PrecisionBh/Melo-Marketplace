import { Ionicons } from "@expo/vector-icons"
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

type Props = {
  value: string
  onChange: (text: string) => void
  placeholder?: string

  showFilters: boolean
  onToggleFilters: () => void

  minPrice: string
  maxPrice: string
  setMinPrice: (val: string) => void
  setMaxPrice: (val: string) => void

  onClearFilters: () => void
  onApplyFilters: () => void
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search marketplace...",
  showFilters,
  onToggleFilters,
  minPrice,
  maxPrice,
  setMinPrice,
  setMaxPrice,
  onClearFilters,
  onApplyFilters,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.searchBox}>
          <Ionicons
            name="search"
            size={18}
            color="#888"
          />

          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#888"
            style={styles.searchInput}
          />

          {value.length > 0 && (
            <TouchableOpacity
              onPress={() => onChange("")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color="#888"
              />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            showFilters && styles.filterBtnActive,
          ]}
          onPress={onToggleFilters}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={showFilters ? "#fff" : "#111"}
          />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>
            Price Range
          </Text>

          <View style={styles.priceRow}>
            <TextInput
              value={minPrice}
              onChangeText={(v) =>
                setMinPrice(
                  v.replace(/[^0-9.]/g, "")
                )
              }
              placeholder="Min"
              keyboardType="decimal-pad"
              style={styles.priceInput}
            />

            <Text style={styles.dash}>—</Text>

            <TextInput
              value={maxPrice}
              onChangeText={(v) =>
                setMaxPrice(
                  v.replace(/[^0-9.]/g, "")
                )
              }
              placeholder="Max"
              keyboardType="decimal-pad"
              style={styles.priceInput}
            />
          </View>

          <View style={styles.actionsRow}>
            {(minPrice || maxPrice) && (
              <TouchableOpacity
                onPress={onClearFilters}
              >
                <Text style={styles.clearText}>
                  Clear
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={onApplyFilters}
            >
              <Text style={styles.applyText}>
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    marginTop: 8,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  searchBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  searchInput: {
    marginLeft: 8,
    flex: 1,
    color: "#111",
    fontSize: 15,
  },

  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },

  filterBtnActive: {
    backgroundColor: "#D97732",
    borderColor: "#D97732",
  },

  filterPanel: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 16,
  },

  filterLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111",
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  priceInput: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },

  dash: {
    marginHorizontal: 10,
    color: "#777",
    fontWeight: "700",
  },

  actionsRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  clearText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D97732",
  },

  applyBtn: {
    backgroundColor: "#D97732",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },

  applyText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
})