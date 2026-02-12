import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useMemo, useState } from "react"
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

type OrderStatus = "completed" | "cancelled" | "refunded"

type Order = {
  id: string
  amount_cents: number
  completed_at: string
  status: OrderStatus
  image_url: string | null
  listing_snapshot: {
    title?: string | null
    image_url?: string | null
  } | null
}

/* ---------------- SCREEN ---------------- */

export default function SellerCompletedOrdersScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | OrderStatus>("all")

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
        status,
        image_url,
        listing_snapshot
      `
      )
      .eq("seller_id", session!.user.id)
      .in("status", ["completed", "cancelled", "refunded"])
      .order("completed_at", { ascending: false })

    if (!error && data) {
      setOrders(data as Order[])
    } else {
      console.log("Seller completed orders load error:", error)
      setOrders([])
    }

    setLoading(false)
  }

  /* ---------------- FILTERED DATA ---------------- */

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders
    return orders.filter((o) => o.status === filter)
  }, [orders, filter])

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
            onPress={() => router.replace("/seller-hub/orders")}
          >
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Completed Sales</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* FILTER PILLS */}
        <View style={styles.filterRow}>
          <FilterPill
            label="All"
            active={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <FilterPill
            label="Completed"
            active={filter === "completed"}
            onPress={() => setFilter("completed")}
          />
          <FilterPill
            label="Cancelled"
            active={filter === "cancelled"}
            onPress={() => setFilter("cancelled")}
          />
          <FilterPill
            label="Refunded"
            active={filter === "refunded"}
            onPress={() => setFilter("refunded")}
          />
        </View>
      </View>

      {/* CONTENT */}
      {filteredOrders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="checkmark-circle-outline"
            size={40}
            color="#7FAF9B"
          />
          <Text style={styles.emptyText}>No sales found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
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
                <Image source={{ uri: imageUri }} style={styles.image} />

                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.listing_snapshot?.title ?? "Item"}
                  </Text>

                  <Text style={styles.price}>
                    ${(item.amount_cents / 100).toFixed(2)}
                  </Text>

                  <Text style={styles.sub}>
                    {item.status.toUpperCase()} ·{" "}
                    {new Date(item.completed_at).toLocaleDateString()}
                  </Text>
                </View>

                <View
                  style={[
                    styles.badge,
                    item.status === "completed" && {
                      backgroundColor: "#27AE60",
                    },
                    item.status === "cancelled" && {
                      backgroundColor: "#F2C94C",
                    },
                    item.status === "refunded" && {
                      backgroundColor: "#EB5757",
                    },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}

/* ---------------- COMPONENTS ---------------- */

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.filterPill,
        active && styles.filterPillActive,
      ]}
    >
      <Text
        style={[
          styles.filterText,
          active && styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

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
    color: "#ffffff",
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

  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E8F5EE",
  },

  filterPillActive: {
    backgroundColor: "#1F7A63",
  },

  filterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F7A63",
  },

  filterTextActive: {
    color: "#fff",
  },

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

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
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
