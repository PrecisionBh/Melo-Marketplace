import { StyleSheet, Text, View } from "react-native"

type Props = {
  itemPrice?: number
  shipping?: number
  sellerFee?: number
  sellerNet?: number
  feePercent?: number
  status: string
}

export default function SellerReceiptCard({
  itemPrice = 0,
  shipping = 0,
  sellerFee = 0,
  sellerNet = 0,
  feePercent = 0,
  status,
}: Props) {
  const isRefunded =
    status === "returned" ||
    status === "refunded" ||
    status === "return_processing"

  // Seller gross = item + shipping only
  const gross = itemPrice + shipping

  return (
    <View style={styles.card}>
      {/* Refund Banner */}
      {isRefunded && (
        <View style={styles.refundedHeader}>
          <Text style={styles.refundedTitle}>Refund in Progress</Text>
          <Text style={styles.refundedSub}>
            This order is being returned. Payout is currently on hold.
          </Text>
        </View>
      )}

      <View style={styles.receipt}>
        {/* Item */}
        <ReceiptRow
          label="Item price"
          value={`$${itemPrice.toFixed(2)}`}
        />

        {/* Always show shipping (even if 0.00) */}
        <ReceiptRow
          label="Shipping collected"
          value={`$${shipping.toFixed(2)}`}
        />

        <View style={styles.receiptDivider} />

        {/* Gross */}
        <ReceiptRow
          label="Your gross (item + shipping)"
          value={`$${gross.toFixed(2)}`}
          subtle
        />

        {/* Seller Fee */}
        <ReceiptRow
          label={`Melo seller fee (${feePercent}%)`}
          value={`-$${sellerFee.toFixed(2)}`}
          subtle
        />

        <View style={styles.receiptDivider} />

        {/* Net Payout */}
        <ReceiptRow
          label="Your payout"
          value={`$${sellerNet.toFixed(2)}`}
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
  card: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDEDE6",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

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