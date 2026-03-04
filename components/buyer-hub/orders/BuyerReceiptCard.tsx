import { StyleSheet, Text, View } from "react-native"

type Props = {
  itemPrice: number
  quantity?: number
  shipping: number
  tax: number
  buyerFee: number
  totalPaid: number
  status?: string
}

export default function BuyerReceiptCard({
  itemPrice,
  quantity = 1,
  shipping,
  tax,
  buyerFee,
  totalPaid,
  status,
}: Props) {
  const isRefunded = status === "returned"

  const itemTotal = itemPrice * quantity

  return (
    <View style={styles.card}>
      {/* 🟢 REFUNDED TITLE (ONLY IF RETURNED) */}
      {isRefunded && (
        <View style={styles.refundedHeader}>
          <Text style={styles.refundedTitle}>Refunded</Text>
          <Text style={styles.refundedSub}>
            Your return was approved and refunded
          </Text>
        </View>
      )}

      <View style={styles.receipt}>

        {/* 🔥 ITEM PRICE BREAKDOWN */}
        {quantity > 1 ? (
          <ReceiptRow
            label="Item price"
            value={`$${itemPrice.toFixed(2)} x ${quantity} = $${itemTotal.toFixed(
              2
            )}`}
          />
        ) : (
          <ReceiptRow
            label="Item price"
            value={`$${itemPrice.toFixed(2)}`}
          />
        )}

        <ReceiptRow
          label="Shipping"
          value={`$${shipping.toFixed(2)}`}
        />

        <ReceiptRow
          label="Sales Tax and Compliance Fee (7.5%)"
          value={`$${tax.toFixed(2)}`}
          subtle
        />

        <ReceiptRow
          label="Buyer protection & processing"
          value={`$${buyerFee.toFixed(2)}`}
          subtle
        />

        <View style={styles.receiptDivider} />

        <ReceiptRow
          label="Total paid"
          value={`$${totalPaid.toFixed(2)}`}
          bold
        />

        {/* 💸 REFUND LINE */}
        {isRefunded && (
          <>
            <View style={styles.receiptDivider} />
            <ReceiptRow
              label="Refund issued"
              value={`-$${totalPaid.toFixed(2)}`}
              refunded
            />
          </>
        )}
      </View>
    </View>
  )
}

function ReceiptRow({
  label,
  value,
  bold,
  subtle,
  refunded,
}: {
  label: string
  value: string
  bold?: boolean
  subtle?: boolean
  refunded?: boolean
}) {
  return (
    <View style={styles.receiptRow}>
      <Text
        style={[
          styles.receiptLabel,
          subtle && styles.subtleText,
          refunded && styles.refundedText,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.receiptValue,
          bold && styles.boldText,
          refunded && styles.refundedValue,
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
    backgroundColor: "#E8F7EF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#B7E4C7",
  },

  refundedTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1F7A63",
    letterSpacing: 0.3,
  },

  refundedSub: {
    fontSize: 12,
    color: "#4F8F7B",
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
    fontSize: 15,
  },

  refundedText: {
    color: "#1F7A63",
    fontWeight: "800",
  },

  refundedValue: {
    color: "#1F7A63",
    fontWeight: "900",
    fontSize: 15,
  },
})