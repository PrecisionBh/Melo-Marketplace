import { StyleSheet, Text, View } from "react-native"

type Props = {
  condition: string
  category: string
  brand?: string | null
  description?: string | null
}

export default function ListingDetailsSection({
  condition,
  category,
  brand,
  description,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Details</Text>

      <DetailRow label="Condition" value={condition} />
      <DetailRow label="Category" value={category} />
      {brand && <DetailRow label="Brand" value={brand} />}

      {description && (
        <>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{description}</Text>
        </>
      )}
    </View>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 22,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF3F0",
  },
  label: {
    color: "#6B8F7D",
    fontWeight: "600",
  },
  value: {
    color: "#0F1E17",
    fontWeight: "800",
  },
  description: {
    marginTop: 6,
    color: "#2E5F4F",
    lineHeight: 20,
  },
})