import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export type SportKey =
  | "all"
  | "billiards"

type Props = {
  active: SportKey
  onChange: (key: SportKey) => void
}

const SPORTS: { key: SportKey; label: string }[] = [
  { key: "all", label: "All Sports" },
  { key: "billiards", label: "Billiards" },
]

export default function SportFilterBar({ active, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {SPORTS.map((s) => {
          const isActive = active === s.key

          return (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.pill,
                isActive && styles.activePill,
                isActive && styles.glow,
              ]}
              onPress={() => onChange(s.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.text, isActive && styles.activeText]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#7FAF9B", // Melo header sage
    paddingVertical: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "center", // 🔥 centers pills
    alignItems: "center",
    gap: 10,
  },

  pill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  activePill: {
    backgroundColor: "#00ff88",
  },

  glow: {
    shadowColor: "#ccff00",
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },

  text: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E1E1E",
  },

  activeText: {
    color: "#0F1E17",
  },
})