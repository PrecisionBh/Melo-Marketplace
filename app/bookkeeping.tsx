import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useMemo, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

type OrderRow = {
  id: string
  seller_id: string
  status: string
  completed_at: string | null
  item_price_cents: number | null
  shipping_amount_cents: number | null
  seller_fee_cents: number | null
  seller_net_cents: number | null
  listing_snapshot: any
}

type RangeKey = "7d" | "30d" | "90d" | "all"

const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
}

function parseListingSnapshot(snapshot: any) {
  if (!snapshot) return null

  if (typeof snapshot === "object") return snapshot

  if (typeof snapshot === "string") {
    try {
      return JSON.parse(snapshot)
    } catch {
      return null
    }
  }

  return null
}

function isWithinRange(dateString: string | null, range: RangeKey) {
  if (!dateString) return false
  if (range === "all") return true

  const completed = new Date(dateString)
  const now = new Date()
  const diffDays =
    (now.getTime() - completed.getTime()) / (1000 * 60 * 60 * 24)

  if (range === "7d") return diffDays <= 7
  if (range === "30d") return diffDays <= 30
  if (range === "90d") return diffDays <= 90

  return true
}

function SummaryCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"]
  iconBg: string
  iconColor: string
  label: string
  value: number
  sub: string
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>

      <Text style={styles.summaryLabel}>{label}</Text>

      <Text style={styles.summaryValue}>
        $
        {value.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Text>

      <Text style={styles.summarySub}>{sub}</Text>
    </View>
  )
}

function TransactionRow({ order }: { order: OrderRow }) {
  const snapshot = parseListingSnapshot(order.listing_snapshot)
  const title = snapshot?.title || "Transaction"
  const dateLabel = order.completed_at
    ? new Date(order.completed_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No date"

  const net = (order.seller_net_cents ?? 0) / 100
  const fee = (order.seller_fee_cents ?? 0) / 100

  return (
    <View style={styles.transactionRow}>
      <View style={styles.transactionIconWrap}>
        <Ionicons name="cube-outline" size={18} color="#7A7F8C" />
      </View>

      <View style={styles.transactionMiddle}>
        <Text numberOfLines={1} style={styles.transactionTitle}>
          {title}
        </Text>
        <Text style={styles.transactionDate}>{dateLabel}</Text>
      </View>

      <View style={styles.transactionRight}>
        <Text style={styles.transactionAmount}>${net.toFixed(2)}</Text>
        <Text style={styles.transactionFee}>-${fee.toFixed(2)} fee</Text>
      </View>
    </View>
  )
}

export default function BookkeepingScreen() {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<RangeKey>("30d")
  const [rangeModalVisible, setRangeModalVisible] = useState(false)

  useEffect(() => {
    if (!userId) return
    loadOrders()
  }, [userId])

  const loadOrders = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, seller_id, status, completed_at, item_price_cents, shipping_amount_cents, seller_fee_cents, seller_net_cents, listing_snapshot"
        )
        .eq("seller_id", userId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })

      if (error) throw error

      setOrders((data as OrderRow[]) || [])
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load bookkeeping.",
        context: "bookkeeping-load",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((order) =>
      isWithinRange(order.completed_at, range)
    )
  }, [orders, range])

  const summary = useMemo(() => {
    const grossSales =
      filteredOrders.reduce(
        (sum, order) => sum + (order.item_price_cents ?? 0),
        0
      ) / 100

    const shippingCollected =
      filteredOrders.reduce(
        (sum, order) => sum + (order.shipping_amount_cents ?? 0),
        0
      ) / 100

    const platformFees =
      filteredOrders.reduce(
        (sum, order) => sum + (order.seller_fee_cents ?? 0),
        0
      ) / 100

    const netEarnings =
      filteredOrders.reduce(
        (sum, order) => sum + (order.seller_net_cents ?? 0),
        0
      ) / 100

    return {
      grossSales,
      shippingCollected,
      platformFees,
      netEarnings,
    }
  }, [filteredOrders])

  if (loading) {
    return (
      <View style={styles.screen}>
        <GlobalHeader />
        <ActivityIndicator style={{ marginTop: 80 }} />
        <GlobalFooter />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Bookkeeping</Text>
            <Text style={styles.pageSub}>
              Track your sales, fees, and earnings
            </Text>
          </View>

          <View style={styles.topActionRow}>
            <TouchableOpacity
              style={styles.filterButton}
              activeOpacity={0.85}
              onPress={() => setRangeModalVisible(true)}
            >
              <Text style={styles.filterButtonText}>
                {RANGE_LABELS[range]}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportButton}
              activeOpacity={0.85}
              onPress={() =>
                Alert.alert("Coming Soon", "Export books coming soon.")
              }
            >
              <Ionicons name="download-outline" size={18} color="#111827" />
              <Text style={styles.exportButtonText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard
            icon="trending-up-outline"
            iconBg="#F5E7DB"
            iconColor="#D97732"
            label="Gross Sales"
            value={summary.grossSales}
            sub="Total item revenue"
          />

          <SummaryCard
            icon="car-outline"
            iconBg="#DDE7FB"
            iconColor="#3B82F6"
            label="Shipping Collected"
            value={summary.shippingCollected}
            sub="From buyers"
          />

          <SummaryCard
            icon="receipt-outline"
            iconBg="#F8DCDC"
            iconColor="#EF4444"
            label="Platform Fees"
            value={summary.platformFees}
            sub="Paid to Melo"
          />

          <SummaryCard
            icon="cash-outline"
            iconBg="#DDF1E0"
            iconColor="#22C55E"
            label="Net Earnings"
            value={summary.netEarnings}
            sub="After fees & shipping"
          />
        </View>

        <View style={styles.transactionsCard}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.transactionsTitle}>Transactions</Text>
            <Text style={styles.transactionsCount}>
              {filteredOrders.length} records
            </Text>
          </View>

          {filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="wallet-outline"
                size={28}
                color="#9CA3AF"
                style={{ marginBottom: 10 }}
              />
              <Text style={styles.emptyTitle}>No transactions in this period</Text>
            </View>
          ) : (
            filteredOrders.map((order, index) => (
              <View
                key={order.id}
                style={[
                  index !== filteredOrders.length - 1 &&
                    styles.transactionDivider,
                ]}
              >
                <TransactionRow order={order} />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <GlobalFooter />

      <Modal
        visible={rangeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRangeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRangeModalVisible(false)}
        >
          <View style={styles.modalCard}>
            {(["7d", "30d", "90d", "all"] as RangeKey[]).map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.modalOption}
                onPress={() => {
                  setRange(item)
                  setRangeModalVisible(false)
                }}
              >
                <Text style={styles.modalOptionText}>
                  {RANGE_LABELS[item]}
                </Text>

                {range === item && (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color="#D97732"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F6F4",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 120,
  },

  headerRow: {
    marginBottom: 22,
  },

  pageTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
  },

  pageSub: {
    marginTop: 4,
    fontSize: 14,
    color: "#6B7280",
  },

  topActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },

  filterButton: {
    flex: 1,
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  filterButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },

  exportButton: {
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  exportButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 18,
    marginBottom: 22,
  },

  summaryCard: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    minHeight: 248,
    justifyContent: "flex-start",
  },

  summaryIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },

  summaryLabel: {
    fontSize: 16,
    color: "#5B6472",
    fontWeight: "500",
    marginBottom: 14,
    lineHeight: 22,
  },

  summaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },

  summarySub: {
    fontSize: 15,
    color: "#5B6472",
    lineHeight: 22,
  },

  transactionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginTop: 4,
  },

  transactionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  transactionsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  transactionsCount: {
    fontSize: 13,
    color: "#6B7280",
  },

  transactionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },

  transactionIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  transactionMiddle: {
    flex: 1,
    paddingRight: 10,
  },

  transactionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  transactionDate: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },

  transactionRight: {
    alignItems: "flex-end",
  },

  transactionAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  transactionFee: {
    marginTop: 4,
    fontSize: 12,
    color: "#EF4444",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 42,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  modalOption: {
    height: 52,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalOptionText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
})