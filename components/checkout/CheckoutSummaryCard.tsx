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

  shippingLoading?: boolean
  shippingVerified?: boolean // ✅ ADD THIS
}

export default function CheckoutSummaryCard({
  subtotalCents,
  shippingCents,
  buyerFeeCents,
  taxCents,
  totalCents,
  onPay,
  paying,
  shippingLoading = false,
  shippingVerified = false, // ✅ ADD THIS
}: Props) {
  const fmt = (cents: number) =>
    `$${(cents / 100).toFixed(2)}`

  const isDisabled = paying || shippingLoading

  return (
    <View style={styles.card}>
      <Text style={styles.header}>
        Order Summary
      </Text>

      <Row
        label="Subtotal"
        value={fmt(subtotalCents)}
      />

      {/* 🔥 SHIPPING ROW */}
      <Row
        label="Shipping"
        value={
  shippingLoading
    ? "Calculating..."
    : !shippingVerified
    ? "Tap to calculate"
    : shippingCents === 0
    ? "Free"
    : fmt(shippingCents)
}
        green={!shippingLoading && shippingCents === 0}
        icon="car-outline"
      />

      {/* 🔥 SHIPPING NOTE */}
      {!shippingLoading && shippingCents > 0 && (
        <Text style={styles.subNote}>
          Calculated based on your location
        </Text>
      )}

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
        style={[
          styles.payBtn,
          isDisabled && styles.payBtnDisabled,
        ]}
        onPress={onPay}
        disabled={isDisabled}
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
            : shippingLoading
            ? "Calculating Shipping..."
            : !shippingVerified
            ? "Verify Address & Calculate Shipping"
            : "Pay Now"}
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

  subNote: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: -6,
    marginBottom: 8,
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

  payBtnDisabled: {
    opacity: 0.6,
  },

  payText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 15,
  },
})