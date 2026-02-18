import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
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
  status: string
  completed_at: string | null
  escrow_status: string | null
  listing_snapshot: {
    title?: string | null
    image_urls?: string[] | null
    image_url?: string | null
  } | null
}

type FilterType = "all" | "completed" | "returned" | "canceled"

/* ---------------- SCREEN ---------------- */

export default function SellerCompletedOrdersScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("all")
  const [search, setSearch] = useState("")

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
          status,
          completed_at,
          escrow_status,
          listing_snapshot
        `)
        .eq("seller_id", session.user.id)
        .in("status", ["completed", "returned", "canceled"])
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

  /* ---------------- FILTER + SEARCH LOGIC ---------------- */

  const filteredOrders = useMemo(() => {
    let result = [...orders]

    // Filter by pill
    if (filter !== "all") {
      result = result.filter((o) => o.status === filter)
    }

    // Search by order id or title
    if (search.trim().length > 0) {
      const q = search.toLowerCase()
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.listing_snapshot?.title?.toLowerCase().includes(q)
      )
    }

    return result
  }, [orders, filter, search])

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Completed Sales"
        backLabel="Orders"
        backRoute="/seller-hub/orders"
      />

      {/* 🔎 SEARCH BAR */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#6B8F7D" />
        <TextInput
          placeholder="Search orders or items..."
          placeholderTextColor="#6B8F7D"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* 🎯 FILTER PILLS (LIKE OFFER SCREEN) */}
      <View style={styles.pillRow}>
        {["all", "completed", "returned", "canceled"].map((p) => {
          const isActive = filter === p
          return (
            <TouchableOpacity
              key={p}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => setFilter(p as FilterType)}
            >
              <Text
                style={[
                  styles.pillText,
                  isActive && styles.pillTextActive,
                ]}
              >
                {p.toUpperCase()}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons
            name="checkmark-done-outline"
            size={40}
            color="#7FAF9B"
          />
          <Text style={styles.emptyText}>
            No orders match your filters.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          renderItem={({ item }) => {
            const imageUri =
              item.listing_snapshot?.image_urls?.[0] ||
              item.listing_snapshot?.image_url ||
              "https://via.placeholder.com/150"

            const statusColor =
              item.status === "completed"
                ? "#27AE60"
                : item.status === "returned"
                ? "#E67E22"
                : "#E5484D"

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
                <Image source={{ uri: imageUri }} style={styles.image} />

                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.listing_snapshot?.title ?? "Item"}
                  </Text>

                  <Text style={styles.subText}>
                    Order #{item.id.slice(0, 8)}
                  </Text>

                  <Text style={styles.subText}>
                    ${(item.amount_cents / 100).toFixed(2)}
                  </Text>

                  <Text style={styles.subText}>
                    {item.completed_at
                      ? new Date(item.completed_at).toLocaleDateString()
                      : "Processed"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.badge,
                    { backgroundColor: statusColor },
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

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: "#E2EFE8",
  },

  searchInput: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F1E17",
  },

  pillRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },

  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E8F5EE",
  },

  pillActive: {
    backgroundColor: "#7FAF9B",
  },

  pillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F1E17",
  },

  pillTextActive: {
    color: "#FFFFFF",
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
