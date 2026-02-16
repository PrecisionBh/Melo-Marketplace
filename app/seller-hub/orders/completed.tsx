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
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type Order = {
  id: string
  amount_cents: number
  buyer_id: string
  completed_at: string | null
  escrow_status: string | null
  listing_snapshot: {
    title?: string | null
    image_urls?: string[] | null
    image_url?: string | null
  } | null
}

/* ---------------- SCREEN ---------------- */

export default function SellerCompletedOrdersScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      if (!session?.user?.id) {
        setOrders([])
        setLoading(false)
        return
      }
      loadOrders()
    }, [session?.user?.id])
  )

  const loadOrders = async () => {
    try {
      if (!session?.user?.id) {
        setOrders([])
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          amount_cents,
          buyer_id,
          completed_at,
          escrow_status,
          listing_snapshot
        `)
        .eq("seller_id", session.user.id)
        .in("status", ["completed", "paid"])
        .order("completed_at", { ascending: false })

      if (error) throw error

      setOrders((data as Order[]) ?? [])
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load completed sales.",
      })
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  return (
    <View style={styles.screen}>
      {/* STANDARDIZED MELO HEADER */}
      <AppHeader
        title="Completed Sales"
        backLabel="Orders"
        backRoute="/seller-hub/orders"
      />

      {orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons
            name="checkmark-done-outline"
            size={40}
            color="#7FAF9B"
          />
          <Text style={styles.emptyText}>
            You haven’t completed any sales yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          renderItem={({ item }) => {
            const imageUri =
              item.listing_snapshot?.image_urls?.[0] ||
              item.listing_snapshot?.image_url ||
              "https://via.placeholder.com/150"

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/seller-hub/orders/[id]",
                    params: { id: item.id },
                  })
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
                    Buyer: {item.buyer_id?.slice(0, 8) ?? "Unknown"}
                  </Text>

                  <Text style={styles.subText}>
                    ${(item.amount_cents / 100).toFixed(2)}
                  </Text>

                  <Text style={styles.subText}>
                    {item.completed_at
                      ? `Completed ${new Date(
                          item.completed_at
                        ).toLocaleDateString()}`
                      : "Completed"}
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

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#6B8F7D",
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
    opacity: 0.95,
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
    backgroundColor: "#27AE60",
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
