import { StyleSheet, Text, View } from "react-native"

/* ---------------- TYPES ---------------- */

type Props = {
  itemPrice: number
  shippingCost: number
  buyerFee: number
  taxCompliance?: number
  buyerTotal: number
}

/* ---------------- COMPONENT ---------------- */

export default function OfferReceiptCard({
  itemPrice,
  shippingCost,
  buyerFee,
  taxCompliance = 0,
  buyerTotal,
}: Props) {
  return (
    <View style={styles.receipt}>
      <Row
        label="Offer Price"
        value={`$${Number(itemPrice || 0).toFixed(2)}`}
      />

      <Row
        label="Shipping"
        value={
          shippingCost > 0
            ? `$${Number(shippingCost).toFixed(2)}`
            : "Free / Included"
        }
      />

      {taxCompliance > 0 && (
        <Row
          label="Tax & Compliance"
          value={`$${Number(taxCompliance).toFixed(2)}`}
        />
      )}

      <Row
        label="Buyer Protection & Processing"
        value={`$${Number(buyerFee || 0).toFixed(2)}`}
      />

      <View style={styles.divider} />

      <Row
        label="Total Due at Checkout"
        value={`$${Number(buyerTotal || 0).toFixed(2)}`}
        bold
      />
    </View>
  )
}

/* ---------------- INTERNAL ROW ---------------- */

function Row({
  label,
  value,
  bold = false,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          bold && styles.rowValueBold,
        ]}
      >
        {value}
      </Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  receipt: {
    backgroundColor: "#F0FAF6",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#CFE5DA",
    marginTop: 4,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },

  rowLabel: {
    color: "#6B8F7D",
    fontWeight: "600",
    fontSize: 14,
  },

  rowValue: {
    fontWeight: "700",
    color: "#0F1E17",
    fontSize: 14,
  },

  rowValueBold: {
    fontWeight: "900",
    color: "#1F7A63",
    fontSize: 16,
  },

  divider: {
    height: 1,
    backgroundColor: "#CFE5DA",
    marginVertical: 10,
  },
})