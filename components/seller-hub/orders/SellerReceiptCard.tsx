import { StyleSheet, Text, View } from "react-native"

type Props = {
  itemPrice: number
  shipping: number
  sellerFeePercent?: number // default 4%
  status?: string
}

export default function SellerReceiptCard({
  itemPrice,
  shipping,
  sellerFeePercent = 4,
  status,
}: Props) {
  const grossTotal = itemPrice + shipping
  const sellerFee = (grossTotal * sellerFeePercent) / 100
  const netPayout = grossTotal - sellerFee

  const isRefunded =
    status === "returned" ||
    status === "refunded" ||
    status === "return_processing"

  return (
    <View style={styles.card}>
      {/* 💸 REFUNDED HEADER (CRITICAL FOR SELLER TRUST) */}
      {isRefunded && (
        <View style={styles.refundedHeader}>
          <Text style={styles.refundedTitle}>Refund in Progress</Text>
          <Text style={styles.refundedSub}>
            This order is being returned. Payout is currently on hold.
          </Text>
        </View>
      )}

      <View style={styles.receipt}>
        <ReceiptRow
          label="Item price"
          value={`$${itemPrice.toFixed(2)}`}
        />

        <ReceiptRow
          label="Shipping collected"
          value={`$${shipping.toFixed(2)}`}
        />

        <View style={styles.receiptDivider} />

        <ReceiptRow
          label="Subtotal (Gross)"
          value={`$${grossTotal.toFixed(2)}`}
          subtle
        />

        <ReceiptRow
          label={`Melo seller fee (${sellerFeePercent}%)`}
          value={`-$${sellerFee.toFixed(2)}`}
          subtle
        />

        <View style={styles.receiptDivider} />

        {/* 🔥 MOST IMPORTANT LINE FOR SELLERS */}
        <ReceiptRow
          label="Your payout"
          value={`$${netPayout.toFixed(2)}`}
          bold
        />
      </View>
    </View>
  )
}

function ReceiptRow({
  label,
  value,
  bold,
  subtle,
}: {
  label: string
  value: string
  bold?: boolean
  subtle?: boolean
}) {
  return (
    <View style={styles.receiptRow}>
      <Text
        style={[
          styles.receiptLabel,
          subtle && styles.subtleText,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.receiptValue,
          bold && styles.boldText,
        ]}
      >
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  /* 🔥 SAME CARD STYLE AS BUYER (UI CONSISTENCY) */
  card: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDEDE6",
    padding: 16,

    // iOS shadow
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },

    // Android shadow
    elevation: 2,
  },

  /* 💸 REFUND / RETURN STATE */
  refundedHeader: {
    backgroundColor: "#FFF4E5",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },

  refundedTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#B26A00",
    letterSpacing: 0.3,
  },

  refundedSub: {
    fontSize: 12,
    color: "#8A5A00",
    fontWeight: "600",
    marginTop: 2,
  },

  receipt: {
    width: "100%",
  },

  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },

  receiptLabel: {
    fontSize: 14,
    color: "#0F1E17",
    fontWeight: "600",
  },

  receiptValue: {
    fontSize: 14,
    color: "#0F1E17",
    fontWeight: "700",
  },

  receiptDivider: {
    height: 1,
    backgroundColor: "#E3EFEA",
    marginVertical: 10,
  },

  subtleText: {
    color: "#6B8F7D",
    fontWeight: "500",
  },

  boldText: {
    fontWeight: "900",
    fontSize: 16,
    color: "#0F1E17",
  },
})