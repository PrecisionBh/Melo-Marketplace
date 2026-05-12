import { useMemo } from "react"
import {
    StyleSheet,
    Text,
    View,
} from "react-native"

type Props = {
  order: any
  currentUserId?: string
}

const formatMoney = (
  cents?: number | null
) => {
  return `$${((cents ?? 0) / 100).toFixed(2)}`
}

export default function Receipt({
  order,
}: Props) {
  console.log("📦 RECEIPT ORDER:", order)

  console.log("🚚 SHIP TO RAW:", {
    shipping_name:
      order?.shipping_name,
    shipping_line1:
      order?.shipping_line1,
    shipping_line2:
      order?.shipping_line2,
    shipping_city:
      order?.shipping_city,
    shipping_state:
      order?.shipping_state,
    shipping_postal_code:
      order?.shipping_postal_code,
    shipping_country:
      order?.shipping_country,
  })

  console.log("↩️ RETURN RAW:", {
    seller: order?.seller,
  })

  const calculations = useMemo(() => {
    const itemSubtotal =
      order?.item_price_cents ?? 0

    const shipping =
      order?.shipping_amount_cents ?? 0

    const taxes =
      order?.tax_cents ??
      order?.tax_amount_cents ??
      0

    const buyerFee =
      order?.buyer_fee_cents ?? 0

    const sellerFee =
      order?.seller_fee_cents ??
      Math.round(itemSubtotal * 0.01)

    const totalPaid =
      order?.amount_cents ??
      order?.total_amount_cents ??
      itemSubtotal +
        shipping +
        taxes +
        buyerFee

    const sellerPayout =
      order?.seller_payout_cents ??
      order?.seller_net_cents ??
      itemSubtotal +
        shipping -
        sellerFee

    return {
      itemSubtotal,
      shipping,
      taxes,
      buyerFee,
      sellerFee,
      totalPaid,
      sellerPayout,
    }
  }, [order])

  /* ---------------- SHIP TO ---------------- */

  const shippingLine1 =
    order?.shipping_line1 ??
    order?.shipping_address_line1

  const shippingLine2 =
    order?.shipping_line2 ??
    order?.shipping_address_line2

  const shippingZip =
    order?.shipping_postal_code ??
    order?.shipping_zip

  const shippingCityStateZip = [
    order?.shipping_city,
    order?.shipping_state,
    shippingZip,
  ]
    .filter(Boolean)
    .join(", ")

  const shippingAddress = [
    order?.shipping_name,
    shippingLine1,
    shippingLine2,
    shippingCityStateZip,
    order?.shipping_country,
  ]
    .filter(
      (line) =>
        typeof line === "string" &&
        line.trim().length > 0
    )
    .join("\n")

  console.log(
    "✅ FINAL SHIP TO:",
    shippingAddress
  )

  /* ---------------- RETURN ADDRESS ---------------- */

  const returnCityStateZip = [
    order?.seller?.city,
    order?.seller?.state,
    order?.seller?.postal_code,
  ]
    .filter(Boolean)
    .join(", ")

  const returnAddress = [
    order?.seller?.shipping_name,
    order?.seller?.address_line1,
    order?.seller?.address_line2,
    returnCityStateZip,
    order?.seller?.country,
  ]
    .filter(
      (line) =>
        typeof line === "string" &&
        line.trim().length > 0
    )
    .join("\n")

  console.log(
    "✅ FINAL RETURN:",
    returnAddress
  )

  return (
    <View style={styles.card}>
      {/* HEADER */}

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>
            Receipt
          </Text>

          <Text style={styles.orderNumber}>
            #
            {order?.public_order_number ??
              order?.id}
          </Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {order?.status ?? "Paid"}
          </Text>
        </View>
      </View>

      {/* RECEIPT SUMMARY */}

      <Text style={styles.sectionTitle}>
        Receipt Summary
      </Text>

      <ReceiptRow
        label="Item subtotal"
        value={formatMoney(
          calculations.itemSubtotal
        )}
      />

      <ReceiptRow
        label="Shipping"
        value={formatMoney(
          calculations.shipping
        )}
      />

      <ReceiptRow
        label="Taxes"
        value={formatMoney(
          calculations.taxes
        )}
      />

      {!!calculations.buyerFee && (
        <ReceiptRow
          label="Processing fee"
          value={formatMoney(
            calculations.buyerFee
          )}
        />
      )}

      <ReceiptRow
        label="Melo fee (1%)"
        value={`-${formatMoney(
          calculations.sellerFee
        )}`}
      />

      <View style={styles.divider} />

      <ReceiptRow
        label="Total Paid"
        value={formatMoney(
          calculations.totalPaid
        )}
        bold
      />

      <ReceiptRow
        label="Seller Payout"
        value={formatMoney(
          calculations.sellerPayout
        )}
        bold
      />

      {/* ---------------- SHIP TO ---------------- */}

      <Text style={styles.sectionTitle}>
        Ship To
      </Text>

      <Text style={styles.address}>
        {shippingAddress ||
          "No shipping address found"}
      </Text>

      {/* ---------------- RETURN ADDRESS ---------------- */}

      <Text style={styles.sectionTitle}>
        Return Address
      </Text>

      <Text style={styles.address}>
        {returnAddress ||
          "No return address found"}
      </Text>
    </View>
  )
}

function ReceiptRow({
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
      <Text
        style={[
          styles.label,
          bold && styles.boldText,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.value,
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
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  orderNumber: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "monospace",
  },

  statusBadge: {
    backgroundColor: "#ECFDF3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusText: {
    color: "#027A48",
    fontWeight: "700",
    textTransform: "capitalize",
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginTop: 18,
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  label: {
    fontSize: 14,
    color: "#4B5563",
  },

  value: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },

  boldText: {
    fontWeight: "800",
    color: "#111827",
  },

  divider: {
    height: 1,
    backgroundColor: "#ECECEC",
    marginVertical: 14,
  },

  address: {
    fontSize: 13,
    lineHeight: 20,
    color: "#374151",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
})