import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
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
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type OrderStatus =
  | "shipped"
  | "delivered"
  | "issue_reported"
  | "return_processing" // ← ADD THIS


type Order = {
  id: string
  status: OrderStatus
  amount_cents: number
  buyer_id: string
  seller_id: string
  created_at: string
  image_url: string | null
  listing_snapshot: {
    title?: string | null
    image_url?: string | null
  } | null
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
    try {
      setLoading(true)

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError

      const sellerId = authData?.user?.id
      if (!sellerId) {
        setOrders([])
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
          created_at,
          image_url,
          listing_snapshot
        `)
        .eq("seller_id", sellerId)
        .in("status", ["shipped", "delivered", "issue_reported", "return_processing"])
        .order("created_at", { ascending: false })

      if (error) throw error

      setOrders((data as Order[]) ?? [])
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load in-progress orders.",
      })
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- UI ---------------- */

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  return (
    <View style={styles.screen}>
      {/* STANDARDIZED HEADER */}
      <AppHeader
        title="In-Progress Orders"
        backLabel="Orders"
        backRoute="/seller-hub/orders"
      />

      {orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="time-outline" size={40} color="#7FAF9B" />
          <Text style={styles.emptyText}>
            No active orders in progress
          </Text>
          <Text style={styles.helperText}>
            Orders will appear here after shipment
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
    {item.listing_snapshot?.title ??
      `Order #${item.id.slice(0, 8)}`}
  </Text>

  <Text style={styles.subText}>
    Buyer: {item.buyer_id?.slice(0, 8) ?? "Unknown"}
  </Text>

  <Text style={styles.subText}>
    ${(item.amount_cents / 100).toFixed(2)}
  </Text>

  {item.status === "shipped" && (
    <Text style={styles.actionHint}>
      Shipped — awaiting delivery
    </Text>
  )}

  {item.status === "delivered" && (
    <Text style={styles.actionHint}>
      Delivered — awaiting buyer completion
    </Text>
  )}

  {item.status === "issue_reported" && (
    <Text style={styles.issueHint}>
      Buyer reported an issue
    </Text>
  )}

  {item.status === "return_processing" && (
    <Text style={styles.issueHint}>
      Return in progress — awaiting buyer shipment
    </Text>
  )}
</View>



                <StatusBadge status={item.status} />
              </TouchableOpacity>
            )
          }}
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
  issue_reported: "#EB5757",
  return_processing: "#F2994A", // Orange = active return state
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

  helperText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
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

  actionHint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#7A5AF8",
  },

  issueHint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "800",
    color: "#C0392B",
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
