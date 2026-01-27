import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

/* ---------------- HELPERS ---------------- */

const formatMoney = (value?: number | null) => {
  if (typeof value !== "number") return "$0.00"
  return `$${value.toFixed(2)}`
}

/* ---------------- TYPES ---------------- */

type OrderStatus =
  | "paid"
  | "shipped"
  | "delivered"
  | "completed"

type ShippingType = "seller_pays" | "buyer_pays"

type Order = {
  id: string
  buyer_id: string
  status: OrderStatus

  amount_cents: number

  shipping_type: ShippingType | null
  shipping_amount_cents: number | null

  image_url: string | null

  listing_snapshot?: {
    title?: string
    image_urls?: string[]
  }

  item_price: number | null
  buyer_fee: number | null

  carrier: string | null
  tracking_number: string | null
  tracking_url: string | null
}

/* ---------------- SCREEN ---------------- */

export default function BuyerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id && session?.user?.id) {
      loadOrder()
    }
  }, [id, session?.user?.id])

  const loadOrder = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data || data.buyer_id !== session?.user?.id) {
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

  /* ---------------- IMAGE ---------------- */

  const imageSrc =
    order.listing_snapshot?.image_urls?.[0] ??
    order.image_url ??
    null

  /* ---------------- ACTIONS ---------------- */

  const confirmDelivery = async () => {
    Alert.alert(
      "Confirm Delivery",
      "Only confirm after receiving and inspecting the item.",
      [
        { text: "Cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setSaving(true)

            await supabase
              .from("orders")
              .update({
                status: "completed",
                completed_at: new Date().toISOString(),
              })
              .eq("id", order.id)

            setSaving(false)
            router.replace("/buyer-hub/orders")
          },
        },
      ]
    )
  }

  const openIssue = () => {
    router.push(`/buyer-hub/orders/dispute-issue?orderId=${order.id}`)
  }

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {imageSrc && (
            <Image
              source={{ uri: encodeURI(imageSrc) }}
              style={styles.image}
            />
          )}

          <Text style={styles.title}>
            Order #{order.id.slice(0, 8)}
          </Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {order.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* STATUS */}
        {order.status === "paid" && (
          <View style={styles.section}>
            <View style={styles.pendingBox}>
              <Text style={styles.pendingTitle}>
                Waiting for shipment
              </Text>
              <Text style={styles.pendingText}>
                Tracking will appear once the seller ships.
              </Text>
            </View>
          </View>
        )}

        {/* TRACKING */}
        {order.tracking_number && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tracking</Text>

            <Text style={styles.infoText}>
              Carrier: {order.carrier}
            </Text>
            <Text style={styles.infoText}>
              Tracking: {order.tracking_number}
            </Text>

            {order.tracking_url && (
              <TouchableOpacity
                style={styles.trackBtn}
                onPress={() =>
                  Linking.openURL(order.tracking_url!)
                }
              >
                <Text style={styles.trackBtnText}>
                  Track Order
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* PAYMENT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>

          {typeof order.item_price === "number" && (
            <Row
              label="Item"
              value={formatMoney(order.item_price)}
            />
          )}

          {order.shipping_type === "seller_pays" && (
            <Row label="Shipping" value="Free" />
          )}

          {order.shipping_type === "buyer_pays" &&
            typeof order.shipping_amount_cents ===
              "number" && (
              <Row
                label="Shipping"
                value={formatMoney(
                  order.shipping_amount_cents / 100
                )}
              />
            )}

          {typeof order.buyer_fee === "number" && (
            <Row
              label="Buyer Protection"
              value={formatMoney(order.buyer_fee)}
            />
          )}

          <View style={styles.divider} />

          <Row
            label="Total Paid"
            value={formatMoney(order.amount_cents / 100)}
            bold
          />
        </View>
      </ScrollView>

      {/* ACTIONS */}
      {order.status === "shipped" && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={confirmDelivery}
            disabled={saving}
          >
            <Text style={styles.primaryText}>
              Confirm Delivery
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.issueBtn}
            onPress={openIssue}
          >
            <Text style={styles.issueText}>
              Report a Problem
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

/* ---------------- ROW ---------------- */

function Row({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          bold && { fontWeight: "900" },
        ]}
      >
        {value}
      </Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F7F8" },

  header: {
    height: 90,
    backgroundColor: "#EAF4EF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#DCEDE4",
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
  },

  content: { padding: 16, paddingBottom: 220 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },

  image: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    marginBottom: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F1E17",
  },

  badge: {
    backgroundColor: "#7FAF9B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 8,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#fff",
  },

  section: { marginTop: 24 },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
  },

  pendingBox: {
    backgroundColor: "#FFF8E1",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F2C94C",
  },

  pendingTitle: {
    fontWeight: "900",
    fontSize: 14,
    color: "#7A5C00",
  },

  pendingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5F4B00",
  },

  infoText: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },

  trackBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#1F7A63",
  },

  trackBtnText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#1F7A63",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  rowLabel: {
    color: "#6B8F7D",
    fontWeight: "600",
  },

  rowValue: {
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: "#DCEDE4",
    marginVertical: 8,
  },

  actionBar: {
    position: "absolute",
    bottom: 85,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },

  primaryBtn: {
    backgroundColor: "#1F7A63",
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 10,
  },

  primaryText: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
  },

  issueBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EB5757",
  },

  issueText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#EB5757",
  },
})
