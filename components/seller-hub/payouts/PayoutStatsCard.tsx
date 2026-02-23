import { StyleSheet, Text, View } from "react-native"

type Props = {
  lifetimeEarningsCents: number
  totalWithdrawnCents: number
  currency?: string
}

function formatMoney(cents: number, currency: string = "USD") {
  const dollars = (cents ?? 0) / 100
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency,
  })
}

export default function PayoutStatsCard({
  lifetimeEarningsCents,
  totalWithdrawnCents,
  currency = "USD",
}: Props) {
  const lifetimeFormatted = formatMoney(lifetimeEarningsCents, currency)
  const withdrawnFormatted = formatMoney(totalWithdrawnCents, currency)

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Financial Overview</Text>

      <View style={styles.row}>
        <View style={styles.statBox}>
          <Text style={styles.label}>Lifetime Earned</Text>
          <Text style={styles.valuePrimary}>{lifetimeFormatted}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statBox}>
          <Text style={styles.label}>Total Withdrawn</Text>
          <Text style={styles.valueSecondary}>{withdrawnFormatted}</Text>
        </View>
      </View>

      <Text style={styles.subtext}>
        This page shows your total earnings and completed withdrawals for
        tracking and record purposes.
      </Text>
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
    marginBottom: 14,
    letterSpacing: 0.3,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statBox: {
    flex: 1,
  },

  divider: {
    width: 1,
    height: 46,
    backgroundColor: "#E2EFE8",
    marginHorizontal: 12,
  },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B8F7D",
    marginBottom: 6,
    letterSpacing: 0.3,
  },

  valuePrimary: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1F7A63", // Melo success green (earned)
  },

  valueSecondary: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F1E17", // Neutral strong (withdrawn)
  },

  subtext: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B8F7D",
    lineHeight: 18,
  },
})