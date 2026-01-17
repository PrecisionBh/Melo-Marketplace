import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { supabase } from "../../lib/supabase"

/* ---------------- TYPES ---------------- */

type Order = {
  id: string
  status:
    | "created"
    | "paid"
    | "shipped"
    | "delivered"
    | "issue_open"
    | "disputed"
    | "completed"
  amount_cents: number
  created_at: string
}

/* ---------------- SCREEN ---------------- */

export default function OrderIndexScreen() {
  const router = useRouter()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("orders")
      .select("id,status,amount_cents,created_at")
      .order("created_at", { ascending: false })

    if (!error && data) {
      setOrders(data as Order[])
    }

    setLoading(false)
  }

  /* ---------------- GROUPING ---------------- */

  const inProgress = useMemo(
    () => orders.filter((o) => o.status !== "completed"),
    [orders]
  )

  const completed = useMemo(
    () => orders.filter((o) => o.status === "completed"),
    [orders]
  )

  /* ---------------- UI ---------------- */

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.replace("/profile")}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>

        <Text style={styles.title}>My Orders</Text>

        <View style={{ width: 40 }} />
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            Return to browsing to make your first purchase!
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
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <>
              {inProgress.length > 0 && (
                <Section title="In Progress" data={inProgress} />
              )}
              {completed.length > 0 && (
                <Section
                  title="Completed"
                  data={completed}
                  muted
                />
              )}
            </>
          }
        />
      )}
    </View>
  )
}

/* ---------------- SECTION ---------------- */

function Section({
  title,
  data,
  muted,
}: {
  title: string
  data: Order[]
  muted?: boolean
}) {
  const router = useRouter()

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {data.map((order) => (
        <TouchableOpacity
          key={order.id}
          style={[styles.card, muted && { opacity: 0.6 }]}
          onPress={() =>
            router.push({
              pathname: "/order/[id]",
              params: { id: order.id },
            })
          }
        >
          <View>
            <Text style={styles.cardTitle}>
              Order #{order.id.slice(0, 8)}
            </Text>
            <Text style={styles.subText}>
              ${(order.amount_cents / 100).toFixed(2)}
            </Text>
          </View>

          <StatusBadge status={order.status} />
        </TouchableOpacity>
      ))}
    </View>
  )
}

/* ---------------- STATUS BADGE ---------------- */

function StatusBadge({ status }: { status: Order["status"] }) {
  const map: Record<string, string> = {
    created: "#BDBDBD",
    paid: "#56CCF2",
    shipped: "#9B51E0",
    delivered: "#27AE60",
    issue_open: "#F2C94C",
    disputed: "#EB5757",
    completed: "#2D9CDB",
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: map[status] ?? "#999" },
      ]}
    >
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

  topBar: {
    paddingTop: 50,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  navText: {
    fontSize: 11,
    marginTop: 2,
    color: "#0F1E17",
    fontWeight: "600",
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F1E17",
    textAlign: "center",
    marginBottom: 16,
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

  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    fontSize: 16,
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
    fontSize: 13,
    color: "#6B8F7D",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
  },
})
