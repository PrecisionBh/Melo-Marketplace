import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type Order = {
  id: string
  status: "paid"
  amount_cents: number
  buyer_id: string
  seller_id: string
  image_url: string | null
  listing_snapshot: {
    title?: string | null
    image_url?: string | null
  } | null
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

    const { data: authData } = await supabase.auth.getUser()
    const sellerId = authData?.user?.id

    if (!sellerId) {
      setOrders([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        amount_cents,
        buyer_id,
        seller_id,
        image_url,
        listing_snapshot
      `)
      .eq("status", "paid")
      .eq("seller_id", sellerId)
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

  const hasOrdersToShip = orders.length > 0

  return (
    <View style={styles.screen}>
      {/* STANDARDIZED HEADER */}
      <AppHeader
        title="Orders to Ship"
        backLabel="Orders"
        backRoute="/seller-hub/orders"
      />

      {/* 🚨 URGENCY BANNER (ONLY IF ORDERS EXIST) */}
      {hasOrdersToShip && (
        <View style={styles.urgencyBanner}>
          <Text style={styles.urgencyText}>
            Your funds are waiting — ship to get paid
          </Text>
        </View>
      )}

      {orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="cube-outline" size={40} color="#7FAF9B" />
          <Text style={styles.emptyText}>
            No orders waiting to be shipped
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          renderItem={({ item }) => {
            const imageUri =
              item.image_url ||
              item.listing_snapshot?.image_url ||
              "https://via.placeholder.com/150"

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  router.push(`/seller-hub/orders/${item.id}`)
                }
              >
                {/* IMAGE */}
                <Image source={{ uri: imageUri }} style={styles.image} />

                {/* INFO */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.listing_snapshot?.title ?? "Item"}
                  </Text>

                  <Text style={styles.subText}>
                    Buyer: {item.buyer_id.slice(0, 8)}
                  </Text>

                  <Text style={styles.subText}>
                    ${(item.amount_cents / 100).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>READY</Text>
                </View>
              </TouchableOpacity>
            )
          }}
        />
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

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
    textAlign: "center",
  },

  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: "center",
  },

  image: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#D6E6DE",
  },

  cardTitle: {
    fontSize: 15,
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
    marginLeft: 6,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },
})
