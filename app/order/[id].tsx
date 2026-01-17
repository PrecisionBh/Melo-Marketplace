import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { supabase } from "../../lib/supabase"

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
  status: OrderStatus

  amount_cents: number
  currency: string

  listing_snapshot: {
    title: string
    image_urls?: string[]
  }

  carrier: string | null
  tracking_number: string | null
  tracking_url: string | null

  delivered_at: string | null
  issue_open_at: string | null

  created_at: string
}

/* ---------------- SCREEN ---------------- */

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [order, setOrder] = useState<Order | null>(null)
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

    const { data: eventData } = await supabase
      .from("order_events")
      .select("*")
      .eq("order_id", orderData.id)
      .order("created_at", { ascending: true })

    setEvents(eventData ?? [])
    setLoading(false)
  }

  /* ---------------- TIME LOGIC ---------------- */

  const issueEscalatable = useMemo(() => {
    if (!order?.issue_open_at) return false
    const opened = new Date(order.issue_open_at).getTime()
    return Date.now() - opened > 24 * 60 * 60 * 1000
  }, [order?.issue_open_at])

  /* ---------------- ACTIONS ---------------- */

  const confirmComplete = async () => {
    Alert.alert(
      "Confirm Order Complete",
      "This will finalize the order and release funds. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            await supabase
              .from("orders")
              .update({
                status: "completed",
                completed_at: new Date().toISOString(),
              })
              .eq("id", order!.id)

            await loadOrder()
          },
        },
      ]
    )
  }

  const reportIssue = async () => {
    await supabase
      .from("orders")
      .update({
        status: "issue_open",
        issue_open_at: new Date().toISOString(),
      })
      .eq("id", order!.id)

    await loadOrder()
  }

  /* ---------------- UI ---------------- */

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 80 }} />
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#1F7A63" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Order</Text>

        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* SUMMARY */}
        <View style={styles.card}>
          {order.listing_snapshot?.image_urls?.[0] && (
            <Image
              source={{ uri: order.listing_snapshot.image_urls[0] }}
              style={styles.productImage}
            />
          )}

          <Text style={styles.orderTitle}>
            {order.listing_snapshot?.title}
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

        {/* ACTIONS */}
        {order.status === "delivered" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={confirmComplete}
            >
              <Text style={styles.primaryText}>
                Confirm Order Complete
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={reportIssue}
            >
              <Text style={styles.secondaryText}>
                Report an Issue with Order
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {order.status === "issue_open" && issueEscalatable && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() =>
               router.push(
               `../dispute-issue?orderId=${order.id}`
               )
              }

            >
              <Text style={styles.dangerText}>
                File a Dispute
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TIMELINE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Updates</Text>

          {events.length === 0 ? (
            <Text style={styles.muted}>No updates yet.</Text>
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
  screen: {
    flex: 1,
    backgroundColor: "#F6F7F8",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

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
  backBtn: {
    width: 32,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F7A63",
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },

  productImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
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

  actions: {
    marginTop: 24,
  },

  primaryBtn: {
    backgroundColor: "#0F1E17",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },

  primaryText: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
  },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#EB5757",
    padding: 14,
    borderRadius: 14,
  },

  secondaryText: {
    color: "#EB5757",
    fontWeight: "800",
    textAlign: "center",
  },

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
