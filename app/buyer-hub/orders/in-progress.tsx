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
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"


/* ---------------- TYPES ---------------- */

/* ---------------- TYPES ---------------- */

type OrderStatus =
  | "created"
  | "paid"
  | "shipped"
  | "delivered"
  | "issue_open"
  | "disputed"
  | "return_processing" // ADDED
  | "completed"
  | "cancelled" // added support (future safe)


type Order = {
  id: string
  buyer_id: string
  status: OrderStatus
  amount_cents: number
  created_at: string
  image_url: string | null
  listing_snapshot: {
    image_url?: string | null
    title?: string | null
  }
}

/* ---------------- SCREEN ---------------- */

export default function BuyerInProgressOrdersScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      loadOrders()
    }
  }, [session?.user?.id])

  const loadOrders = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        buyer_id,
        status,
        amount_cents,
        created_at,
        image_url,
        listing_snapshot
      `)
      .eq("buyer_id", session!.user.id)
      .in("status", ["paid", "shipped", "delivered", "disputed", "return_processing"])
      .order("created_at", { ascending: false })

    if (error) {
  handleAppError(error, {
    fallbackMessage: "Failed to load active orders.",
  })
  setOrders([])
} else {
  setOrders((data as Order[]) ?? [])
}
setLoading(false)

  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="In-Progress"
        backRoute="/buyer-hub/orders"
      />

      {/* CONTENT */}
      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            You don’t have any active orders.
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
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
          renderItem={({ item }) => {
            const imageUri =
              item.image_url ||
              item.listing_snapshot?.image_url ||
              null

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "./[id]",
                    params: { id: item.id },
                  })
                }
              >
                {/* IMAGE */}
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.image}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons
                      name="image-outline"
                      size={22}
                      color="#7FAF9B"
                    />
                  </View>
                )}

                {/* INFO */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.listing_snapshot?.title ??
                      `Order #${item.id.slice(0, 8)}`}
                  </Text>

                  <Text style={styles.price}>
                    ${(item.amount_cents / 100).toFixed(2)}
                  </Text>
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

/* ---------------- STATUS BADGE (UPGRADED) ---------------- */

function StatusBadge({ status }: { status: OrderStatus }) {
  const config: Record<
    OrderStatus,
    { label: string; color: string }
  > = {
    created: {
      label: "CREATED",
      color: "#BDBDBD",
    },
    paid: {
      label: "PAID",
      color: "#56CCF2",
    },
    shipped: {
      label: "SHIPPED",
      color: "#9B51E0",
    },
    delivered: {
      label: "DELIVERED",
      color: "#27AE60",
    },
    issue_open: {
      label: "ISSUE OPEN",
      color: "#F2C94C",
    },
    disputed: {
      label: "IN DISPUTE",
      color: "#EB5757",
    },

    return_processing: {
    label: "RETURN IN PROGRESS", // NEW (clear for buyers)
    color: "#F2994A", // orange = action state (good UX)
  },
    completed: {
      label: "COMPLETED",
      color: "#6FCF97",
    },
    cancelled: {
      label: "CANCELLED",
      color: "#4F4F4F",
    },
  }

  const badge = config[status] ?? {
    label: status.toUpperCase(),
    color: "#999",
  }

  return (
    <View style={[styles.badge, { backgroundColor: badge.color }]}>
      <Text style={styles.badgeText}>{badge.label}</Text>
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

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
    marginBottom: 14,
    textAlign: "center",
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

  imagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
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

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 6,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
  },
})
