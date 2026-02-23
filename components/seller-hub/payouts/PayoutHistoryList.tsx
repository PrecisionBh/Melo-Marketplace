import { FlatList, StyleSheet, Text, View } from "react-native"

type Payout = {
  id: string
  amount_cents: number
  net_cents: number
  fee_cents: number
  method: string
  status: string
  created_at: string
}

type Props = {
  payouts: Payout[]
  currency?: string
  loading?: boolean
}

function formatMoney(cents: number, currency: string = "USD") {
  const dollars = (cents ?? 0) / 100
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency,
  })
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function StatusBadge({ status }: { status: string }) {
  const isPaid = status === "paid"
  const isPending = status === "pending"

  return (
    <View
      style={[
        styles.badge,
        isPaid && styles.badgePaid,
        isPending && styles.badgePending,
      ]}
    >
      <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
    </View>
  )
}

function PayoutRow({
  payout,
  currency,
}: {
  payout: Payout
  currency: string
}) {
  const gross = formatMoney(payout.amount_cents, currency)
  const net = formatMoney(payout.net_cents, currency)
  const fee =
    payout.fee_cents && payout.fee_cents > 0
      ? formatMoney(payout.fee_cents, currency)
      : null

  const date = formatDate(payout.created_at)
  const isInstant = payout.method === "instant"
  const methodLabel = isInstant
    ? "Instant Withdrawal"
    : "Standard Withdrawal"

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {/* Net received (primary number - what hit their bank) */}
        <Text style={styles.amount}>{net}</Text>

        {/* Breakdown for transparency */}
        <Text style={styles.meta}>
          {methodLabel} • {date}
        </Text>

        <View style={styles.breakdown}>
          <Text style={styles.breakdownText}>
            Gross: {gross}
          </Text>

          {fee && (
            <Text style={styles.feeText}>
              Instant Fee (3%): -{fee}
            </Text>
          )}

          {isInstant && (
            <Text style={styles.netSubText}>
              Net Sent to Bank: {net}
            </Text>
          )}
        </View>
      </View>

      <StatusBadge status={payout.status} />
    </View>
  )
}

export default function PayoutHistoryList({
  payouts,
  currency = "USD",
  loading = false,
}: Props) {
  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Withdrawal History</Text>
        <Text style={styles.emptyText}>Loading payouts…</Text>
      </View>
    )
  }

  if (!payouts || payouts.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Withdrawal History</Text>
        <Text style={styles.emptyText}>
          No withdrawals yet. Your payout history will appear here once you
          make a withdrawal.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Withdrawal History</Text>

      <FlatList
        data={payouts}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ paddingTop: 8 }}
        renderItem={({ item }) => (
          <PayoutRow payout={item} currency={currency} />
        )}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2EFE8",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  title: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F1E17",
    marginBottom: 6,
    letterSpacing: 0.3,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 14,
  },

  left: {
    flex: 1,
    paddingRight: 12,
  },

  amount: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F1E17",
  },

  meta: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B8F7D",
    marginTop: 2,
  },

  breakdown: {
    marginTop: 6,
  },

  breakdownText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B8F7D",
  },

  feeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E5484D",
    marginTop: 2,
  },

  netSubText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F1E17",
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: "#EEF5F1",
  },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#EAF4EF",
  },

  badgePaid: {
    backgroundColor: "#E8F7EF",
  },

  badgePending: {
    backgroundColor: "#FFF4E5",
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: "#0F1E17",
  },

  emptyText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B8F7D",
    lineHeight: 18,
  },
})