import { notify } from "@/lib/notifications/notify"
import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type OrderStatus = "paid" | "shipped" | "delivered" | "completed"

type Order = {
  id: string
  seller_id: string
  buyer_id: string
  status: OrderStatus

  // 💰 NEW: Proper ledger fields (source of truth)
  amount_cents: number
  item_price_cents: number | null
  shipping_amount_cents: number | null
  tax_cents: number | null
  seller_fee_cents: number | null
  seller_net_cents: number | null

  image_url: string | null

  carrier: string | null
  tracking_number: string | null

  shipping_name: string | null
  shipping_line1: string | null
  shipping_line2: string | null
  shipping_city: string | null
  shipping_state: string | null
  shipping_postal_code: string | null
  shipping_country: string | null
}

/* ---------------- HELPERS ---------------- */

const buildTrackingUrl = (carrier: string, tracking: string) => {
  switch (carrier) {
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`
    case "UPS":
      return `https://www.ups.com/track?tracknum=${tracking}`
    case "FedEx":
      return `https://www.fedex.com/fedextrack/?tracknumbers=${tracking}`
    case "DHL":
      return `https://www.dhl.com/en/express/tracking.html?AWB=${tracking}`
    default:
      return null
  }
}

/* ---------------- SCREEN ---------------- */

export default function SellerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  const [carrier, setCarrier] = useState("")
  const [tracking, setTracking] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id && session?.user?.id) {
      loadOrder()
    }
  }, [id, session?.user?.id])

  const loadOrder = async () => {
    setLoading(true)

    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single()

    if (!data || data.seller_id !== session?.user?.id) {
      router.back()
      return
    }

    setOrder(data)
    setCarrier(data.carrier ?? "")
    setTracking(data.tracking_number ?? "")
    setLoading(false)
  }

  /* ---------------- ACTIONS ---------------- */

  const submitTracking = async () => {
    if (!carrier || !tracking || !order) return

    setSaving(true)

    const trackingUrl = buildTrackingUrl(carrier, tracking)

    const { error } = await supabase
      .from("orders")
      .update({
        carrier,
        tracking_number: tracking,
        tracking_url: trackingUrl,
        status: "shipped",
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    setSaving(false)

    if (error) {
      Alert.alert("Error", "Failed to mark order as shipped.")
      return
    }

    await notify({
      userId: order.buyer_id,
      type: "order",
      title: "Order shipped",
      body: "Your order has been shipped. Tracking information is now available.",
      data: {
        route: "/buyer-hub/orders/[id]",
        params: { id: order.id },
      },
    })

    Alert.alert(
      "Order Shipped",
      "Tracking has been added and the order is now in progress.",
      [
        {
          text: "OK",
          onPress: () =>
            router.replace("/seller-hub/orders/orders-to-ship"),
        },
      ]
    )
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 80 }} />
  }

  if (!order) return null

  /* ---------------- MONEY (CORRECT LEDGER LOGIC) ---------------- */

  // 🔐 Use DB snapshots — NEVER recompute from amount_cents
  const itemPrice = (order.item_price_cents ?? 0) / 100
  const shipping = (order.shipping_amount_cents ?? 0) / 100
  const tax = (order.tax_cents ?? 0) / 100
  const sellerFee = (order.seller_fee_cents ?? 0) / 100
  const sellerNet = (order.seller_net_cents ?? 0) / 100

  // What the seller actually sold (item + shipping)
  const saleSubtotal = itemPrice + shipping

  /* ---------------- RENDER ---------------- */

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
        {/* PRODUCT */}
        <View style={styles.card}>
          {order.image_url && (
            <Image
              source={{ uri: encodeURI(order.image_url) }}
              style={styles.image}
            />
          )}

          <View style={styles.titleRow}>
            <Text style={styles.title}>
              Order #{order.id.slice(0, 8)}
            </Text>

            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {order.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* SHIPPING ADDRESS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ship To</Text>

          <Text style={styles.addressText}>{order.shipping_name}</Text>
          <Text style={styles.addressText}>{order.shipping_line1}</Text>
          {order.shipping_line2 && (
            <Text style={styles.addressText}>
              {order.shipping_line2}
            </Text>
          )}
          <Text style={styles.addressText}>
            {order.shipping_city}, {order.shipping_state}{" "}
            {order.shipping_postal_code}
          </Text>
          <Text style={styles.addressText}>{order.shipping_country}</Text>
        </View>

        {/* TRACKING */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tracking</Text>

          {order.status === "paid" ? (
            <>
              <View style={styles.carrierRow}>
                {["USPS", "UPS", "FedEx", "DHL"].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.carrierBtn,
                      carrier === c && styles.carrierActive,
                    ]}
                    onPress={() => setCarrier(c)}
                  >
                    <Text
                      style={[
                        styles.carrierText,
                        carrier === c &&
                          styles.carrierTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                placeholder="Enter tracking number"
                value={tracking}
                onChangeText={setTracking}
                style={styles.input}
              />
            </>
          ) : (
            <>
              <Text style={styles.infoText}>
                Carrier: {order.carrier}
              </Text>
              <Text style={styles.infoText}>
                Tracking: {order.tracking_number}
              </Text>
            </>
          )}
        </View>

        {/* RECEIPT (ACCOUNTING-CORRECT) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sale Breakdown</Text>

          <Row label="Item Price" value={`$${itemPrice.toFixed(2)}`} />
          <Row label="Shipping" value={`$${shipping.toFixed(2)}`} />
          <Row label="Subtotal" value={`$${saleSubtotal.toFixed(2)}`} />
          <Row label="Platform Fee (4%)" value={`-$${sellerFee.toFixed(2)}`} />
          <Row
            label="Your Payout"
            value={`$${sellerNet.toFixed(2)}`}
            bold
          />
        </View>
      </ScrollView>

      {/* ACTION BAR */}
      {order.status === "paid" && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (!carrier || !tracking) &&
                styles.primaryDisabled,
            ]}
            disabled={!carrier || !tracking || saving}
            onPress={submitTracking}
          >
            <Text style={styles.primaryText}>
              {saving
                ? "Saving…"
                : "Add Tracking & Mark Shipped"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

/* ---------------- COMPONENTS ---------------- */

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
        style={[styles.rowValue, bold && { fontWeight: "900" }]}
      >
        {value}
      </Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF", // Melo soft background
  },

  /* ---------- HEADER ---------- */
  header: {
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "#7FAF9B", // Melo brand color
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F1E17",
    letterSpacing: 0.3,
  },

  /* ---------- LAYOUT ---------- */
  content: {
    padding: 18,
    paddingBottom: 140,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  image: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    marginBottom: 14,
    backgroundColor: "#F2F2F2",
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F1E17",
    flex: 1,
    marginRight: 12,
  },

  badge: {
    backgroundColor: "#1F7A63",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  /* ---------- SECTIONS ---------- */
  section: {
    marginTop: 26,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2EFE8",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
    color: "#0F1E17",
    letterSpacing: 0.3,
  },

  /* ---------- ADDRESS ---------- */
  addressText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2E5F4F",
    marginBottom: 3,
  },

  /* ---------- TRACKING ---------- */
  carrierRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  carrierBtn: {
    borderWidth: 1,
    borderColor: "#CFE6DD",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#F4FAF7",
  },

  carrierActive: {
    backgroundColor: "#7FAF9B",
    borderColor: "#7FAF9B",
  },

  carrierText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F1E17",
  },

  carrierTextActive: {
    color: "#FFFFFF",
  },

  input: {
    backgroundColor: "#F4FAF7",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#D6E6DE",
    fontSize: 14,
    fontWeight: "600",
    color: "#0F1E17",
  },

  infoText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2E5F4F",
    marginBottom: 4,
  },

  /* ---------- RECEIPT / LEDGER ---------- */
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF5F1",
  },

  rowLabel: {
    color: "#6B8F7D",
    fontWeight: "700",
    fontSize: 13,
  },

  rowValue: {
    fontWeight: "800",
    fontSize: 13,
    color: "#0F1E17",
  },

  /* ---------- ACTION BAR ---------- */
  actionBar: {
    position: "absolute",
    bottom: 85,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
  },

  primaryBtn: {
    backgroundColor: "#0F1E17",
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  primaryDisabled: {
    backgroundColor: "#A7C8BB",
  },

  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
    textAlign: "center",
    letterSpacing: 0.3,
  },
})
