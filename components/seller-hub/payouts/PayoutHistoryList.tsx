import { useMemo, useState } from "react"
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native"

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

type FilterKey = "all" | "instant" | "standard"

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



function Pill({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

function PayoutRow({ payout, currency }: { payout: Payout; currency: string }) {
  const gross = formatMoney(payout.amount_cents, currency)
  const net = formatMoney(payout.net_cents, currency)
  const fee =
    payout.fee_cents && payout.fee_cents > 0
      ? formatMoney(payout.fee_cents, currency)
      : null

  const date = formatDate(payout.created_at)
  const isInstant = payout.method === "instant"
  const methodLabel = isInstant ? "Instant Withdrawal" : "Standard Withdrawal"

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
          <Text style={styles.breakdownText}>Gross: {gross}</Text>

          {fee && <Text style={styles.feeText}>Instant Fee: -{fee}</Text>}

          {isInstant && (
            <Text style={styles.netSubText}>Net Sent to Bank: {net}</Text>
          )}
        </View>
      </View>
    </View>
  )
}

export default function PayoutHistoryList({
  payouts,
  currency = "USD",
  loading = false,
}: Props) {
  const [filter, setFilter] = useState<FilterKey>("all")

  const filtered = useMemo(() => {
    if (!payouts) return []

    switch (filter) {
      case "instant":
        return payouts.filter((p) => p.method === "instant")
      case "standard":
        return payouts.filter((p) => p.method !== "instant")
      default:
        return payouts
    }
  }, [payouts, filter])

  const summary = useMemo(() => {
    const gross = filtered.reduce((sum, p) => sum + (p.amount_cents ?? 0), 0)
    const net = filtered.reduce((sum, p) => sum + (p.net_cents ?? 0), 0)
    const fees = filtered.reduce((sum, p) => sum + (p.fee_cents ?? 0), 0)

    const instantCount = filtered.filter((p) => p.method === "instant").length
    const standardCount = filtered.length - instantCount

    return { gross, net, fees, instantCount, standardCount, count: filtered.length }
  }, [filtered])

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
          No withdrawals yet. Your payout history will appear here once you make
          a withdrawal.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Withdrawal History</Text>

      {/* FILTER PILLS */}
      <View style={styles.pillsRow}>
        <Pill label="All" active={filter === "all"} onPress={() => setFilter("all")} />
        <Pill
          label="Instant"
          active={filter === "instant"}
          onPress={() => setFilter("instant")}
        />
        <Pill
          label="Standard"
          active={filter === "standard"}
          onPress={() => setFilter("standard")}
        />
      </View>

      {/* SUMMARY STRIP */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Gross</Text>
          <Text style={styles.summaryValue}>{formatMoney(summary.gross, currency)}</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Net</Text>
          <Text style={styles.summaryValueStrong}>
            {formatMoney(summary.net, currency)}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Fees</Text>
          <Text style={styles.summaryValueFee}>
            {formatMoney(summary.fees, currency)}
          </Text>
        </View>
      </View>

      <Text style={styles.taxNote}>
        Tip: payout processing fees are typically deductible business expenses — keep records for tax season.
      </Text>

      <Text style={styles.miniMeta}>
        Showing {summary.count} payout{summary.count === 1 ? "" : "s"} •{" "}
        {summary.instantCount} instant • {summary.standardCount} standard
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ paddingTop: 8 }}
        renderItem={({ item }) => <PayoutRow payout={item} currency={currency} />}
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
    marginBottom: 10,
    letterSpacing: 0.3,
  },

  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  pill: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2EFE8",
    backgroundColor: "#F6FBF8",
    alignItems: "center",
    justifyContent: "center",
  },

  pillActive: {
    backgroundColor: "#0F1E17",
    borderColor: "#0F1E17",
  },

  pillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F1E17",
  },

  pillTextActive: {
    color: "#FFFFFF",
  },

  summaryCard: {
    borderWidth: 1,
    borderColor: "#E2EFE8",
    backgroundColor: "#F7FBF9",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  summaryCol: {
    flex: 1,
  },

  summaryDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#E2EFE8",
    marginHorizontal: 10,
  },

  summaryLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B8F7D",
    marginBottom: 4,
    letterSpacing: 0.3,
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F1E17",
  },

  summaryValueStrong: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1F7A63",
  },

  summaryValueFee: {
    fontSize: 14,
    fontWeight: "900",
    color: "#E5484D",
  },

  taxNote: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B8F7D",
    lineHeight: 17,
  },

  miniMeta: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B8F7D",
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