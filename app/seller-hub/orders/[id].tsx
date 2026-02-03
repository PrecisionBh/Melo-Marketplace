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
  status: OrderStatus

  // 🔒 SNAPSHOTS (AUTHORITATIVE)
  item_price_cents: number            // SALE PRICE ONLY (NO SHIPPING)
  shipping_amount_cents: number | null
  seller_fee_cents: number
  seller_net_cents: number

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
    if (id && session?.user?.id) loadOrder()
  }, [id, session?.user?.id])

  const loadOrder = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data || data.seller_id !== session?.user?.id) {
      router.back()
      return
    }

    setOrder(data)
    setCarrier(data.carrier ?? "")
    setTracking(data.tracking_number ?? "")
    setLoading(false)
  }

  const submitTracking = async () => {
    if (!carrier || !tracking || !order) return

    setSaving(true)

    const { error } = await supabase
      .from("orders")
      .update({
        carrier,
        tracking_number: tracking,
        status: "shipped",
        shipped_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    setSaving(false)

    if (error) {
      Alert.alert("Error", "Failed to mark order as shipped.")
      return
    }

    Alert.alert(
      "Order Shipped",
      "Tracking has been added and the order is now in escrow.",
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

  /* ---------------- MONEY (DISPLAY ONLY) ---------------- */

  const salePrice = order.item_price_cents / 100
  const shipping = (order.shipping_amount_cents ?? 0) / 100
  const sellerFee = order.seller_fee_cents / 100
  const escrow = order.seller_net_cents / 100

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
            <Text style={styles.addressText}>{order.shipping_line2}</Text>
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
                        carrier === c && styles.carrierTextActive,
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

        {/* RECEIPT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sale Breakdown</Text>

          <Row label="Sale Price" value={`$${salePrice.toFixed(2)}`} />
          <Row label="Shipping (You Keep)" value={`$${shipping.toFixed(2)}`} />
          <Row
            label="Marketplace Fee (4%)"
            value={`-$${sellerFee.toFixed(2)}`}
          />
          <Row
            label="Pending Escrow (Your Payout)"
            value={`$${escrow.toFixed(2)}`}
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
              (!carrier || !tracking) && styles.primaryDisabled,
            ]}
            disabled={!carrier || !tracking || saving}
            onPress={submitTracking}
          >
            <Text style={styles.primaryText}>
              {saving ? "Saving…" : "Add Tracking & Mark Shipped"}
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
      <Text style={[styles.rowValue, bold && { fontWeight: "900" }]}>
        {value}
      </Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F7F8" },

  header: {
    height: 56,
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

  content: { padding: 16, paddingBottom: 180 },

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
    marginRight: 10,
  },

  badge: {
    backgroundColor: "#7FAF9B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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

  addressText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },

  carrierRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  carrierBtn: {
    borderWidth: 1,
    borderColor: "#D1E9DD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
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
    color: "#fff",
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#D1E9DD",
  },

  infoText: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
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
  },

  primaryDisabled: {
    backgroundColor: "#A7C8BB",
  },

  primaryText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
    textAlign: "center",
  },
})
