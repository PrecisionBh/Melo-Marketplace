import { StyleSheet, Text, View } from "react-native"

type Props = {
  condition: string
  category: string
  brand?: string | null
  description?: string | null
  quantityAvailable?: number | null
  shippingPrice?: number | string | null
}

export default function ListingDetailsSection({
  condition,
  category,
  brand,
  description,
  quantityAvailable,
  shippingPrice,
}: Props) {
  const hasStock =
    typeof quantityAvailable === "number" && quantityAvailable > 0

  const formattedShipping =
    shippingPrice !== null && shippingPrice !== undefined
      ? `$${Number(shippingPrice).toFixed(2)} per item`
      : null

  const stockText =
    quantityAvailable === null || quantityAvailable === undefined
      ? null
      : hasStock
      ? `${quantityAvailable} in stock`
      : "Out of stock"

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Details</Text>

      <DetailRow label="Condition" value={formatValue(condition)} />
      <DetailRow label="Category" value={formatValue(category)} />

      {brand && (
        <DetailRow label="Brand" value={formatValue(brand)} />
      )}

      {/* 🔥 NEW: Available Quantity */}
      {stockText && (
        <DetailRow label="Available" value={stockText} />
      )}

      {/* 🔥 NEW: Per-item Shipping */}
      {formattedShipping && (
        <DetailRow label="Shipping" value={formattedShipping} />
      )}

      {description && description.trim().length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{description}</Text>
        </>
      )}
    </View>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

// Optional helper to make values look nicer (e.g., jump_cue -> Jump Cue)
function formatValue(value: string) {
  if (!value) return ""
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
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
    textAlign: "right",
    maxWidth: "60%",
  },
  description: {
    marginTop: 6,
    color: "#2E5F4F",
    lineHeight: 20,
  },
})