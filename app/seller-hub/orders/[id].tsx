import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type OrderStatus =
  | "created"
  | "paid"
  | "shipped"
  | "delivered"
  | "issue_open"
  | "disputed"
  | "completed"

type Order = {
  id: string
  seller_id: string
  status: OrderStatus
  amount_cents: number
  listing_snapshot: {
    title: string
    image_urls?: string[]
  }
  carrier: string | null
  tracking_number: string | null
  created_at: string
}

/* ---------------- SCREEN ---------------- */

export default function SellerOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()
  const user = session?.user

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id && user) loadOrder()
  }, [id, user])

  const loadOrder = async () => {
    setLoading(true)

    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single()

    if (!data || data.seller_id !== user?.id) {
      router.back()
      return
    }

    setOrder(data)
    setLoading(false)
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 80 }} />
  }

  if (!order) return null

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#1F7A63" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ORDER CARD */}
        <View style={styles.card}>
          {order.listing_snapshot?.image_urls?.[0] && (
            <Image
              source={{ uri: order.listing_snapshot.image_urls[0] }}
              style={styles.image}
            />
          )}

          <Text style={styles.title}>
            {order.listing_snapshot.title}
          </Text>

          <StatusBadge status={order.status} />

          <Text style={styles.price}>
            ${(order.amount_cents / 100).toFixed(2)}
          </Text>
        </View>

        {/* SHIPPING */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping</Text>

          {order.tracking_number ? (
            <>
              <DetailRow label="Carrier" value={order.carrier ?? "—"} />
              <DetailRow label="Tracking #" value={order.tracking_number} />
            </>
          ) : (
            <Text style={styles.muted}>
              Shipping info has not been added yet.
            </Text>
          )}
        </View>

        {/* DISPUTE ACTION */}
        {order.status === "disputed" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() =>
                router.push(
                  `../disputes-issue?orderId=${order.id}`
                )
              }
            >
              <Text style={styles.dangerText}>
                Respond to Dispute
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

/* ---------------- COMPONENTS ---------------- */

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, string> = {
    created: "#BDBDBD",
    paid: "#56CCF2",
    shipped: "#9B51E0",
    delivered: "#27AE60",
    issue_open: "#F2C94C",
    disputed: "#EB5757",
    completed: "#2D9CDB",
  }

  return (
    <View style={[styles.badge, { backgroundColor: map[status] }]}>
      <Text style={styles.badgeText}>
        {status.replace("_", " ").toUpperCase()}
      </Text>
    </View>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F7F8" },

  header: {
    height: 56,
    backgroundColor: "#E8F5EE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D1E9DD",
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F7A63",
  },

  content: { padding: 16, paddingBottom: 120 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },

  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F1E17",
  },

  price: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "900",
    color: "#0F1E17",
  },

  badge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    alignSelf: "flex-start",
  },

  badgeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 11,
  },

  section: { marginTop: 24 },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },

  muted: { color: "#6B8F7D" },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  label: { color: "#6B8F7D", fontWeight: "600" },
  value: { fontWeight: "700" },

  actions: { marginTop: 24 },

  dangerBtn: {
    backgroundColor: "#EB5757",
    padding: 14,
    borderRadius: 14,
  },

  dangerText: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
  },
})
