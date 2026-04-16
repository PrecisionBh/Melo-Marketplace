import {
    StyleSheet,
    Text,
    View,
} from "react-native"

export default function OfferReceiptCard({
  rows,
}: {
  rows: {
    label: string
    value: string
    bold?: boolean
  }[]
}) {
  return (
    <View style={styles.card}>
      {rows.map((row, i) => (
        <View
          key={i}
          style={styles.row}
        >
          <Text style={styles.label}>
            {row.label}
          </Text>

          <Text
            style={[
              styles.value,
              row.bold && styles.bold,
            ]}
          >
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    marginBottom: 16,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  label: {
    fontSize: 14,
    color: "#666",
  },

  value: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },

  bold: {
    fontSize: 15,
    fontWeight: "800",
  },
})