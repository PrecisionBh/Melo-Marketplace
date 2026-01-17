import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { supabase } from "@/lib/supabase"

type Order = {
  id: string
  status: "paid" | "shipped"
  amount_cents: number
  buyer_id: string
  listing_snapshot: {
    title: string
  }
}

export default function OrdersToShipScreen() {
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      loadOrders()
    }, [])
  )

  const loadOrders = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("orders")
      .select("id,status,amount_cents,buyer_id,listing_snapshot")
      .in("status", ["paid"])
      .order("created_at", { ascending: true })

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
      {/* HEADER WRAP */}
      <View style={styles.headerWrap}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#0F1E17" />
          </TouchableOpacity>

          <Text style={styles.title}>Orders to Ship</Text>
          <View style={{ width: 22 }} />
        </View>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            No orders waiting to be shipped.
          </Text>
        </View>
      ) : (
        <View>
          {orders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/order/[id]",
                  params: { id: order.id },
                })
              }
            >
              <View>
                <Text style={styles.cardTitle}>
                  {order.listing_snapshot?.title ?? "Item"}
                </Text>

                <Text style={styles.subText}>
                  Buyer: {order.buyer_id.slice(0, 8)}
                </Text>

                <Text style={styles.subText}>
                  ${(order.amount_cents / 100).toFixed(2)}
                </Text>
              </View>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>PAID</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  /* 🌿 Sage header wrapper */
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
    color: "#0F1E17",
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

  badge: {
    backgroundColor: "#F2C94C",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0F1E17",
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B8F7D",
    textAlign: "center",
  },
})
