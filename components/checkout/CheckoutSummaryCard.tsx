import { Ionicons } from "@expo/vector-icons"
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

type Props = {
  subtotalCents: number
  shippingCents: number
  buyerFeeCents: number
  taxCents: number
  totalCents: number

  onPay: () => void
  paying: boolean
}

export default function CheckoutSummaryCard({
  subtotalCents,
  shippingCents,
  buyerFeeCents,
  taxCents,
  totalCents,
  onPay,
  paying,
}: Props) {
  const fmt = (cents: number) =>
    `$${(cents / 100).toFixed(2)}`

  return (
    <View style={styles.card}>
      <Text style={styles.header}>
        Order Summary
      </Text>

      <Row
        label="Subtotal"
        value={fmt(subtotalCents)}
      />

      <Row
        label="Shipping"
        value={
          shippingCents === 0
            ? "Free"
            : fmt(shippingCents)
        }
        green={shippingCents === 0}
        icon="car-outline"
      />

      <Row
        label="Buyer Protection Fee"
        value={fmt(buyerFeeCents)}
        icon="shield-checkmark-outline"
      />

      <Row
        label="Est. Tax"
        value={fmt(taxCents)}
      />

      <View style={styles.divider} />

      <Row
        label="Total"
        value={fmt(totalCents)}
        bold
      />

      <TouchableOpacity
        style={styles.payBtn}
        onPress={onPay}
        disabled={paying}
        activeOpacity={0.85}
      >
        <Ionicons
          name="lock-closed-outline"
          size={16}
          color="#FFF"
        />

        <Text style={styles.payText}>
          {paying
            ? "Processing..."
            : "Proceed to Payment"}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

function Row({
  label,
  value,
  bold = false,
  green = false,
  icon,
}: {
  label: string
  value: string
  bold?: boolean
  green?: boolean
  icon?: any
}) {
  return (
    <View style={styles.row}>
      <View style={styles.labelWrap}>
        {icon && (
          <Ionicons
            name={icon}
            size={14}
            color="#6B7280"
            style={{ marginRight: 6 }}
          />
        )}

        <Text
          style={[
            styles.label,
            bold && styles.bold,
          ]}
        >
          {label}
        </Text>
      </View>

      <Text
        style={[
          styles.value,
          bold && styles.bold,
          green && styles.green,
        ]}
      >
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 18,
    marginBottom: 20,
  },

  header: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
    marginBottom: 14,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    alignItems: "center",
  },

  labelWrap: {
    flexDirection: "row",
    alignItems: "center",
  },

  label: {
    fontSize: 14,
    color: "#6B7280",
  },

  value: {
    fontSize: 14,
    color: "#111",
    fontWeight: "600",
  },

  bold: {
    fontWeight: "800",
    color: "#111",
    fontSize: 15,
  },

  green: {
    color: "#16A34A",
  },

  divider: {
    height: 1,
    backgroundColor: "#F1F1F1",
    marginVertical: 8,
  },

  payBtn: {
    marginTop: 14,
    backgroundColor: "#D97732",
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  payText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 15,
  },
})