import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type OrderStatus =
  | "shipped"
  | "delivered"
  | "issue_reported"

type Order = {
  id: string
  status: OrderStatus
  amount_cents: number
  buyer_id: string
  created_at: string
  carrier?: string | null
  tracking_number?: string | null
}

/* ---------------- SCREEN ---------------- */

export default function SellerInProgressOrdersScreen() {
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,status,amount_cents,buyer_id,created_at,carrier,tracking_number"
      )
      .in("status", ["shipped", "delivered", "issue_reported"])
      .order("created_at", { ascending: false })

    if (!error && data) {
      setOrders(data as Order[])
    } else {
      setOrders([])
    }

    setLoading(false)
  }

  /* ---------------- UI ---------------- */

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.headerWrap}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#0F1E17" />
          </TouchableOpacity>

          <Text style={styles.title}>In-Progress Orders</Text>
          <View style={{ width: 22 }} />
        </View>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            No active orders in progress.
          </Text>

          <Text style={styles.helperText}>
            Please check Orders to Ship.
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 140 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/seller-hub/orders/[id]",
                  params: { id: item.id },
                })
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  Order #{item.id.slice(0, 8)}
                </Text>

                <Text style={styles.subText}>
                  Buyer: {item.buyer_id.slice(0, 8)}
                </Text>

                <Text style={styles.subText}>
                  ${(item.amount_cents / 100).toFixed(2)}
                </Text>

                {item.status === "shipped" &&
                  item.tracking_number && (
                    <Text style={styles.actionHint}>
                      Tracking added
                    </Text>
                  )}

                {item.status === "delivered" && (
                  <Text style={styles.actionHint}>
                    Delivered — awaiting buyer confirmation
                  </Text>
                )}

                {item.status === "issue_reported" && (
                  <Text style={styles.actionHint}>
                    Buyer reported an issue
                  </Text>
                )}
              </View>

              <StatusBadge status={item.status} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

/* ---------------- STATUS BADGE ---------------- */

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, string> = {
    shipped: "#9B51E0",
    delivered: "#27AE60",
    issue_reported: "#F2C94C",
  }

  return (
    <View style={[styles.badge, { backgroundColor: map[status] }]}>
      <Text style={styles.badgeText}>
        {status.replace("_", " ").toUpperCase()}
      </Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  headerWrap: {
    backgroundColor: "#7FAF9B",
  },

  topBar: {
    paddingTop: 50,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#6B8F7D",
    textAlign: "center",
  },

  helperText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F1E17",
    textAlign: "center",
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F1E17",
  },

  subText: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B8F7D",
  },

  actionHint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#C17C00",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 10,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
  },
})
