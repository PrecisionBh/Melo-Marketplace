import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { useAuth } from "../../context/AuthContext"
import { supabase } from "../../lib/supabase"

/* ---------------- TYPES ---------------- */

type Order = {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  status: string
  total_price: number
  shipping_price: number
  tracking_number: string | null
  carrier: string | null
  created_at: string
}

type Listing = {
  title: string
}

/* ---------------- SCREEN ---------------- */

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [listing, setListing] = useState<Listing | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) loadOrder()
  }, [id])

  const loadOrder = async () => {
    setLoading(true)

    const { data: orderData } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single()

    if (!orderData) {
      setLoading(false)
      return
    }

    setOrder(orderData)

    const { data: listingData } = await supabase
      .from("listings")
      .select("title")
      .eq("id", orderData.listing_id)
      .maybeSingle()

    setListing(listingData)

    const { data: eventData } = await supabase
      .from("order_events")
      .select("*")
      .eq("order_id", orderData.id)
      .order("created_at", { ascending: true })

    setEvents(eventData ?? [])
    setLoading(false)
  }

  /* ---------------- UI ---------------- */

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text>Order not found.</Text>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Order</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ORDER SUMMARY */}
        <View style={styles.card}>
          <Text style={styles.orderTitle}>
            {listing?.title ?? "Item"}
          </Text>

          <StatusBadge status={order.status} />

          <Text style={styles.price}>
            ${order.total_price.toFixed(2)}
          </Text>

          {order.shipping_price > 0 && (
            <Text style={styles.subText}>
              Shipping: ${order.shipping_price.toFixed(2)}
            </Text>
          )}
        </View>

        {/* TRACKING */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping</Text>

          {order.tracking_number ? (
            <>
              <DetailRow
                label="Carrier"
                value={order.carrier ?? "—"}
              />
              <DetailRow
                label="Tracking #"
                value={order.tracking_number}
              />
            </>
          ) : (
            <Text style={styles.muted}>
              Tracking has not been added yet.
            </Text>
          )}
        </View>

        {/* TIMELINE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Updates</Text>

          {events.length === 0 ? (
            <Text style={styles.muted}>
              No updates yet.
            </Text>
          ) : (
            events.map((e) => (
              <View key={e.id} style={styles.eventRow}>
                <View style={styles.dot} />
                <Text style={styles.eventText}>
                  {e.message}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  )
}

/* ---------------- COMPONENTS ---------------- */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "#F2C94C",
    confirmed: "#56CCF2",
    shipped: "#9B51E0",
    delivered: "#27AE60",
    completed: "#2D9CDB",
    cancelled: "#EB5757",
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: map[status] ?? "#999" },
      ]}
    >
      <Text style={styles.badgeText}>
        {status.toUpperCase()}
      </Text>
    </View>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  topBar: {
    paddingTop: 50,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },

  orderTitle: {
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

  subText: {
    fontSize: 13,
    color: "#6B8F7D",
    marginTop: 4,
  },

  badge: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#fff",
  },

  section: {
    marginTop: 24,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F1E17",
    marginBottom: 10,
  },

  muted: {
    color: "#6B8F7D",
    fontSize: 13,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  label: {
    color: "#6B8F7D",
    fontWeight: "600",
  },

  value: {
    color: "#0F1E17",
    fontWeight: "700",
  },

  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#7FAF9B",
    marginRight: 10,
  },

  eventText: {
    color: "#0F1E17",
    fontWeight: "600",
  },
})
