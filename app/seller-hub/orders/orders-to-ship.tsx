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

/* ---------------- TYPES ---------------- */

type Order = {
  id: string
  status: "paid" | "shipped"
  amount_cents: number
  buyer_id: string
  seller_id: string
  listing_snapshot: {
    title: string
  }
}

/* ---------------- SCREEN ---------------- */

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

    const {
      data: authData,
    } = await supabase.auth.getUser()

    const userId = authData?.user?.id
    if (!userId) {
      setOrders([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("orders")
      .select("id,status,amount_cents,buyer_id,seller_id,listing_snapshot")
      .eq("status", "paid")
      .eq("seller_id", userId) // 🔒 CRITICAL SAFETY FILTER
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
      {/* HEADER */}
      <View style={styles.headerWrap}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.title}>Orders to Ship</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* 🔴 URGENCY BANNER */}
        <View style={styles.urgencyBanner}>
          <Text style={styles.urgencyText}>
            Your funds are waiting — ship to get paid
          </Text>
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
                  pathname: "/seller-hub/orders/[id]",
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
                <Text style={styles.badgeText}>READY TO SHIP</Text>
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
    color: "#FFFFFF",
  },

  urgencyBanner: {
    backgroundColor: "#D64545",
    paddingVertical: 8,
    paddingHorizontal: 14,
  },

  urgencyText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
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

  badge: {
    backgroundColor: "#EB5757",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
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
