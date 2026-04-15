import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export type FilterOption = {
  key: string
  label: string
}

type Props = {
  active: string
  onChange: (key: string) => void
  options?: FilterOption[]
}

const DEFAULT_FILTERS: FilterOption[] = [
  { key: "all", label: "All" },
  { key: "electronics", label: "Electronics" },
  { key: "fashion", label: "Clothing" },
  { key: "home_garden", label: "Home" },
  { key: "sports_outdoors", label: "Sports" },
  { key: "collectibles", label: "Collectibles" },
  { key: "automotive", label: "Automotive" },
  { key: "other", label: "Other" },
]

export default function FilterBar({
  active,
  onChange,
  options,
}: Props) {
  const filtersToRender =
    options?.length ? options : DEFAULT_FILTERS

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {filtersToRender.map((f) => {
          const isActive = active === f.key

          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.pill,
                isActive && styles.activePill,
              ]}
              onPress={() => onChange(f.key)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.text,
                  isActive && styles.activeText,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    overflow: "hidden",

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  scroll: {
    gap: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },

  pill: {
    backgroundColor: "#F3F6F4",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },

  activePill: {
    backgroundColor: "#D97732",
  },

  text: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E1E1E",
  },

  activeText: {
    color: "#fff",
  },
})