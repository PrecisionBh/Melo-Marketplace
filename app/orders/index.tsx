import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import OrderFilterModal from "@/components/filters/OrderFilterModal"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"
import { useFocusEffect, useRouter } from "expo-router"

import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

const STATUS_CONFIG: Record<
  string,
  {
    label: string
    bg: string
    text: string
  }
> = {
  paid: {
    label: "Awaiting Label",
    bg: "#FEF3C7",
    text: "#92400E",
  },
  shipped: {
    label: "Shipped",
    bg: "#E0E7FF",
    text: "#4338CA",
  },
  delivered: {
    label: "Delivered",
    bg: "#CCFBF1",
    text: "#0F766E",
  },
  completed: {
    label: "Completed",
    bg: "#DCFCE7",
    text: "#15803D",
  },
  return_started: {
    label: "Return Started",
    bg: "#FDE68A",
    text: "#92400E",
  },
  return_processing: {
    label: "Return Processing",
    bg: "#FCA5A5",
    text: "#991B1B",
  },
  disputed: {
    label: "Disputed",
    bg: "#FECACA",
    text: "#991B1B",
  },
  cancelled: {
  label: "Cancelled",
  bg: "#E5E7EB",
  text: "#374151",
},
}

export default function OrdersScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [activeTab, setActiveTab] = useState<
    "selling" | "buying"
  >("selling")
const [showFilters, setShowFilters] = useState(false)
const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [sellingOrders, setSellingOrders] = useState<any[]>([])
  const [buyingOrders, setBuyingOrders] = useState<any[]>([])

  useFocusEffect(
    useCallback(() => {
      if (!session?.user?.id) return
      loadOrders()
    }, [session?.user?.id])
  )

  const loadOrders = async () => {
    try {
      setLoading(true)

      const userId = session?.user?.id
      if (!userId) return

      const [sellingRes, buyingRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("seller_id", userId)
          .order("created_at", { ascending: false }),

        supabase
          .from("orders")
          .select("*")
          .eq("buyer_id", userId)
          .order("created_at", { ascending: false }),
      ])

      if (sellingRes.error) throw sellingRes.error
      if (buyingRes.error) throw buyingRes.error

      const filteredSellingOrders = (sellingRes.data ?? []).filter(
  (order) =>
    !(
      order.status === "pending_payment" &&
      !order.offer_id
    )
)

const filteredBuyingOrders = (buyingRes.data ?? []).filter(
  (order) =>
    !(
      order.status === "pending_payment" &&
      !order.offer_id
    )
)

setSellingOrders(filteredSellingOrders)
setBuyingOrders(filteredBuyingOrders)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load orders.",
      })
    } finally {
      setLoading(false)
    }
  }

 const baseOrders =
  activeTab === "selling"
    ? sellingOrders
    : buyingOrders

const activeOrders =
  selectedStatuses.length === 0
    ? baseOrders
    : baseOrders.filter((order) =>
        selectedStatuses.includes(order.status)
      )

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
  <Text style={styles.title}>Orders</Text>

  <TouchableOpacity
    style={styles.filterBtn}
    onPress={() => setShowFilters(true)}
  >
    <Text style={styles.filterText}>Filter</Text>
  </TouchableOpacity>
</View>

        <View style={styles.tabsWrap}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "selling" &&
                styles.activeTabBtn,
            ]}
            onPress={() => setActiveTab("selling")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "selling" &&
                  styles.activeTabText,
              ]}
            >
              Selling ({sellingOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "buying" &&
                styles.activeTabBtn,
            ]}
            onPress={() => setActiveTab("buying")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "buying" &&
                  styles.activeTabText,
              ]}
            >
              Buying ({buyingOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : activeOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {activeTab === "selling"
                ? "No orders to fulfill yet"
                : "No purchases yet"}
            </Text>

            <Text style={styles.emptySub}>
              {activeTab === "selling"
                ? "Orders from your listings will appear here."
                : "Items you purchase will appear here."}
            </Text>
          </View>
        ) : (
          activeOrders.map((order) => (
  <OrderCard
    key={order.id}
    order={order}
    currentUserId={session?.user?.id ?? ""}
    onPress={() =>
      router.push(`/orders/${order.id}`)
    }
  />
))
        )}
      </ScrollView>

      <OrderFilterModal
  visible={showFilters}
  onClose={() => setShowFilters(false)}
  selectedStatuses={selectedStatuses}
  setSelectedStatuses={setSelectedStatuses}
  STATUS_CONFIG={STATUS_CONFIG}
/>

      <GlobalFooter />
    </View>
  )
}

function OrderCard({
  order,
  onPress,
  currentUserId,
}: {
  order: any
  onPress: () => void
  currentUserId: string
}) {
  const isBuyer = order.buyer_id === currentUserId
  const isSeller = order.seller_id === currentUserId

  let cfg =
  STATUS_CONFIG[order.status] ?? {
    label: "Unknown",
    bg: "#E5E7EB",
    text: "#374151",
  }

// 🔥 CANCELLED (highest priority)
if (order.status === "cancelled") {
  cfg = {
    label: "Cancelled",
    bg: "#E5E7EB",
    text: "#374151",
  }
}

// 🔥 BUYER NEEDS TO PAY
else if (isBuyer && order.status === "pending_payment") {
  cfg = {
    label: "Pay Now",
    bg: "#D97732",
    text: "#fff",
  }
}

// 🔥 SELLER NEEDS TO SHIP
else if (isSeller && order.status === "paid") {
  cfg = {
    label: "Awaiting Label",
    bg: "#FEF3C7",
    text: "#92400E",
  }
}

  const image =
    order.listing_snapshot?.image_urls?.[0] ??
    order.image_url

  const title =
    order.listing_snapshot?.title ??
    "Order"

  return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={onPress}
    >
      {image ? (
        <Image
          source={{ uri: image }}
          style={styles.orderImage}
        />
      ) : (
        <View style={styles.imagePlaceholder} />
      )}

      <View style={styles.orderInfo}>
        <Text style={styles.orderTitle}>
          {title}
        </Text>

        <Text style={styles.orderDate}>
          #{order.public_order_number ?? order.id}
        </Text>

        <Text style={styles.orderPrice}>
          ${(order.amount_cents / 100).toFixed(2)}
        </Text>
      </View>

      <View
        style={[
          styles.statusPill,
          { backgroundColor: cfg.bg },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            { color: cfg.text },
          ]}
        >
          {cfg.label}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 120,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginBottom: 18,
  },

  tabsWrap: {
    flexDirection: "row",
    backgroundColor: "#ECECEC",
    padding: 4,
    borderRadius: 16,
    marginBottom: 20,
  },

  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  activeTabBtn: {
    backgroundColor: "#D97732",
  },

  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
  },

  activeTabText: {
    color: "#fff",
  },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 28,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },

  emptySub: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
  },

  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 14,
    marginBottom: 12,
  },

  orderImage: {
    width: 58,
    height: 58,
    borderRadius: 14,
    marginRight: 12,
  },

  imagePlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: "#EEE",
    marginRight: 12,
  },

  orderInfo: {
    flex: 1,
  },

  orderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },

  orderDate: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },

  orderPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
    marginTop: 4,
  },

  headerRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 18,
},

filterBtn: {
  backgroundColor: "#111827",
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 10,
},

filterText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 12,
},

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
})