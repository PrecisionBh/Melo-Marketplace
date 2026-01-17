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

type Order = {
  id: string
  status:
    | "created"
    | "paid"
    | "shipped"
    | "delivered"
    | "issue_open"
    | "disputed"
    | "completed"
  amount_cents: number
  created_at: string
}

/* ---------------- SCREEN ---------------- */

export default function BuyerInProgressOrdersScreen() {
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
      .select("id,status,amount_cents,created_at")
      .neq("status", "completed")
      .order("created_at", { ascending: false })

    if (!error && data) {
      setOrders(data as Order[])
    } else {
      setOrders([])
    }

    setLoading(false)
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace("/buyer-hub/orders")}
        >
          <Ionicons name="arrow-back" size={20} color="#E8F5EE" />
          <Text style={styles.backText}>My Orders</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>In-Progress Orders</Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            You don’t have any active orders right now.
          </Text>

          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.browseText}>Browse Listings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/order/[id]",
                  params: { id: item.id },
                })
              }
            >
              <View>
                <Text style={styles.cardTitle}>
                  Order #{item.id.slice(0, 8)}
                </Text>

                <Text style={styles.subText}>
                  ${(item.amount_cents / 100).toFixed(2)}
                </Text>
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

function StatusBadge({ status }: { status: Order["status"] }) {
  const map: Record<string, string> = {
    created: "#BDBDBD",
    paid: "#56CCF2",
    shipped: "#9B51E0",
    delivered: "#27AE60",
    issue_open: "#F2C94C",
    disputed: "#EB5757",
  }

  return (
    <View style={[styles.badge, { backgroundColor: map[status] ?? "#999" }]}>
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

  header: {
    paddingTop: 60,
    paddingBottom: 14,
    alignItems: "center",
    backgroundColor: "#7FAF9B",
  },

  backBtn: {
    position: "absolute",
    left: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  backText: {
    marginLeft: 6,
    color: "#E8F5EE",
    fontWeight: "600",
    fontSize: 13,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#E8F5EE",
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F1E17",
    textAlign: "center",
    marginBottom: 16,
  },

  browseBtn: {
    backgroundColor: "#0F1E17",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
  },

  browseText: {
    color: "#fff",
    fontWeight: "800",
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
    fontSize: 13,
    color: "#6B8F7D",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
  },
})
