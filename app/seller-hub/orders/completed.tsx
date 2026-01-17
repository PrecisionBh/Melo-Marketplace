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

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

type Order = {
  id: string
  amount_cents: number
  buyer_id: string
  listing_snapshot: {
    title: string
  } | null
  completed_at: string
}

export default function SellerCompletedOrdersScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      if (!session?.user?.id) return
      loadOrders()
    }, [session?.user?.id])
  )

  const loadOrders = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, amount_cents, buyer_id, listing_snapshot, completed_at"
      )
      .eq("seller_id", session!.user!.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })

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
      {/* 🌿 HEADER WRAP */}
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#0F1E17" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Completed Sales</Text>

          <View style={{ width: 22 }} />
        </View>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            You haven’t completed any sales yet.
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

                <Text style={styles.subText}>
                  Completed{" "}
                  {new Date(order.completed_at).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>COMPLETED</Text>
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

  /* 🌿 HEADER */
  headerWrap: {
    backgroundColor: "#7FAF9B",
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 14,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
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
    opacity: 0.8,
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
    backgroundColor: "#27AE60",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#fff",
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
