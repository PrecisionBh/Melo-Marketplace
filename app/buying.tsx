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

import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabase"

type Order = {
  id: string
  listing_title: string
  total_paid: number
  status: "pending" | "confirmed" | "shipped" | "completed"
  created_at: string
}

export default function BuyingScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    if (!session?.user) return

    setLoading(true)

    const { data } = await supabase
      .from("orders")
      .select("id, listing_title, total_paid, status, created_at")
      .eq("buyer_id", session.user.id)
      .order("created_at", { ascending: false })

    if (data) setOrders(data as Order[])
    setLoading(false)
  }

  const inProgress = useMemo(
    () => orders.filter((o) => o.status !== "completed"),
    [orders]
  )

  const completed = useMemo(
    () => orders.filter((o) => o.status === "completed"),
    [orders]
  )

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.topBar}>
        {/* HOME */}
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => router.replace("/")}
        >
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Buying</Text>

        {/* PROFILE */}
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => router.push("/profile")}
        >
          <Ionicons name="arrow-forward" size={22} color="#0F1E17" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
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
          ListHeaderComponent={
            <>
              {inProgress.length > 0 && (
                <Section title="In Progress" data={inProgress} />
              )}
              {completed.length > 0 && (
                <Section title="Completed" data={completed} muted />
              )}
            </>
          }
          data={[]}
          renderItem={null}
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
              {order.listing_title}
            </Text>
            <Text style={styles.subText}>
              ${order.total_paid.toFixed(2)}
            </Text>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>{order.status}</Text>
          </View>
        </TouchableOpacity>
      ))}
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

  navBtn: {
    alignItems: "center",
    width: 60,
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
    backgroundColor: "#7FAF9B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F1E17",
    textTransform: "capitalize",
  },
})
