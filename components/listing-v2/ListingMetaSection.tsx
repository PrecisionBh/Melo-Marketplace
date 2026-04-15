import {
    StyleSheet,
    Text,
    View,
} from "react-native"

export default function ListingMetaSection({
  condition,
  category,
  description,
}: {
  condition: string
  category: string
  description?: string | null
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.pillsRow}>
        <Pill text={category} />

        <Pill
          text={condition}
          orange
        />
      </View>

      {!!description && (
        <Text style={styles.description}>
          {description}
        </Text>
      )}
    </View>
  )
}

function Pill({
  text,
  orange,
}: {
  text: string
  orange?: boolean
}) {
  return (
    <View
      style={[
        styles.pill,
        orange && styles.orangePill,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          orange &&
            styles.orangePillText,
        ]}
      >
        {text}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    marginBottom: 18,
  },

  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },

  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F3F3",
  },

  pillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    textTransform: "capitalize",
  },

  orangePill: {
    backgroundColor: "#FFF7ED",
  },

  orangePillText: {
    color: "#D97732",
  },

  description: {
    fontSize: 16,
    lineHeight: 32,
    color: "#5E6470",
  },
})