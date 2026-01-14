import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

export type FilterKey =
  | "all"
  | "cues"
  | "cases"
  | "new"
  | "used"
  | "other"

type Props = {
  active: FilterKey
  onChange: (key: FilterKey) => void
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "cues", label: "Cues" },
  { key: "cases", label: "Cases" },
  { key: "new", label: "New" },
  { key: "used", label: "Used" },
  { key: "other", label: "Other" }, // 👈 far right
]

export default function FilterBar({ active, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {FILTERS.map((f) => {
          const isActive = active === f.key

          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.pill, isActive && styles.activePill]}
              onPress={() => onChange(f.key)}
            >
              <Text style={[styles.text, isActive && styles.activeText]}>
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
    backgroundColor: "#0F1E17", // same as header
    paddingVertical: 8,
    paddingLeft: 12,
  },

  scroll: {
    gap: 8,
    paddingRight: 12,
  },

  pill: {
    backgroundColor: "#24352D",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },

  activePill: {
    backgroundColor: "#7FAF9B",
  },

  text: {
    fontSize: 12,
    fontWeight: "700",
    color: "#CFE3D8",
  },

  activeText: {
    color: "#0F1E17",
  },
})
