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

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type Order = {
  id: string
  amount_cents: number
  completed_at: string
  image_url: string | null
  listing_snapshot: {
    title?: string | null
    image_url?: string | null
  } | null
}

/* ---------------- SCREEN ---------------- */

export default function BuyerCompletedOrdersScreen() {
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
        `
        id,
        amount_cents,
        completed_at,
        image_url,
        listing_snapshot
      `
      )
      .eq("buyer_id", session!.user.id)
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
      {/* HEADER */}
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.replace("/buyer-hub/orders")}
          >
            <Ionicons name="arrow-back" size={22} color="#0F1E17" />
            <Text style={styles.headerSub}>My Orders</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Completed Orders</Text>

          <View style={{ width: 60 }} />
        </View>
      </View>

      {/* CONTENT */}
      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle-outline" size={40} color="#7FAF9B" />
          <Text style={styles.emptyText}>No completed orders yet</Text>
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
                  router.push(`/buyer-hub/orders/${item.id}`)
                }
              >
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.listing_snapshot?.title ?? "Item"}
                  </Text>

                  <Text style={styles.price}>
                    ${(item.amount_cents / 100).toFixed(2)}
                  </Text>

                  <Text style={styles.sub}>
                    Completed{" "}
                    {new Date(item.completed_at).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>COMPLETED</Text>
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

  /* HEADER */
  headerWrap: {
    backgroundColor: "#7FAF9B",
    paddingTop: 50,
    paddingBottom: 12,
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

  headerBtn: {
    alignItems: "center",
    minWidth: 60,
  },

  headerSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#0F1E17",
  },

  /* EMPTY */
  empty: {
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
  },

  /* CARD (MATCHES WATCHING) */
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: "center",
    opacity: 0.9,
  },

  image: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#D6E6DE",
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F1E17",
  },

  price: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
  },

  sub: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B8F7D",
  },

  badge: {
    backgroundColor: "#27AE60",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 6,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#fff",
  },
})
