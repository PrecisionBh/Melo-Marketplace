import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
  buyer_id: string
  status: OrderStatus
  amount_cents: number
  item_price_cents: number | null
  shipping_amount_cents: number | null
  buyer_fee_cents: number | null
  image_url: string | null
  tracking_url: string | null
  carrier: string | null
  completed_at: string | null
  listing_snapshot: {
    title?: string | null
  } | null
}

/* ---------------- SCREEN ---------------- */

export default function BuyerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (id && session?.user?.id) loadOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadOrder = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        buyer_id,
        status,
        amount_cents,
        item_price_cents,
        shipping_amount_cents,
        buyer_fee_cents,
        image_url,
        tracking_url,
        carrier,
        completed_at,
        listing_snapshot
      `)
      .eq("id", id)
      .single()

    if (error || !data || data.buyer_id !== session!.user.id) {
      router.replace("/buyer-hub/orders")
      return
    }

    setOrder(data)
    setLoading(false)
  }

  /* ---------------- ACTIONS ---------------- */

  const cancelOrder = async () => {
    Alert.alert(
      "Cancel Order",
      "Item price and shipping will be refunded. Buyer Protection & Processing fees are non-refundable.",
      [
        { text: "Never mind" },
        {
          text: "Cancel Order",
          style: "destructive",
          onPress: async () => {
            await supabase
              .from("orders")
              .update({ status: "completed" })
              .eq("id", order!.id)

            router.replace("/buyer-hub/orders")
          },
        },
      ]
    )
  }

  /**
   * ✅ Confirm Delivery
   * This triggers:
   * 1. Stripe balance check
   * 2. Platform → Seller transfer
   * 3. Supabase escrow + wallet updates (inside function)
   */
  const confirmDelivery = async () => {
    if (!order || processing) return

    setProcessing(true)

    const { error } = await supabase.functions.invoke("execute-stripe-payout", {
      body: {
        order_id: order.id,
        user_id: order.buyer_id,
      },
    })

    if (error) {
      Alert.alert(
        "Payment Pending",
        error.message ??
          "Funds are not available yet. Please try again shortly."
      )
      setProcessing(false)
      return
    }

    setConfirmVisible(false)
    setProcessing(false)

    router.replace("/buyer-hub/orders/completed")
  }

  if (loading || !order) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  const isCompleted = order.status === "completed"
  const canCancel = order.status === "paid"

  const canTrack =
    !!order.tracking_url &&
    ["shipped", "delivered", "completed"].includes(order.status)

  const canConfirmDelivery = order.status === "shipped"

  /* ---------------- RECEIPT (SOURCE OF TRUTH = ORDERS TABLE) ---------------- */

  const itemPrice = (order.item_price_cents ?? 0) / 100
  const shipping = (order.shipping_amount_cents ?? 0) / 100
  const buyerFee = (order.buyer_fee_cents ?? 0) / 100
  const totalPaid = (order.amount_cents ?? 0) / 100

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order</Text>
        <View style={{ width: 22 }} />
      </View>

      <Image
        source={{ uri: order.image_url ?? undefined }}
        style={styles.image}
      />

      <View style={styles.content}>
        <Text style={styles.orderNumber}>Order #{order.id.slice(0, 8)}</Text>

        {order.listing_snapshot?.title && (
          <Text style={styles.title}>{order.listing_snapshot.title}</Text>
        )}

        <View
          style={[
            styles.badge,
            isCompleted && { backgroundColor: "#27AE60" },
          ]}
        >
          <Text style={styles.badgeText}>
            {isCompleted
              ? "COMPLETED"
              : order.status === "paid"
              ? "WAITING FOR SELLER TO SHIP"
              : order.status.replace("_", " ").toUpperCase()}
          </Text>
        </View>

        <View style={styles.receipt}>
          <ReceiptRow label="Item price" value={`$${itemPrice.toFixed(2)}`} />
          <ReceiptRow label="Shipping" value={`$${shipping.toFixed(2)}`} />
          <ReceiptRow
            label="Buyer protection & processing"
            value={`$${buyerFee.toFixed(2)}`}
            subtle
          />
          <View style={styles.receiptDivider} />
          <ReceiptRow label="Total paid" value={`$${totalPaid.toFixed(2)}`} bold />
        </View>

        {/* Optional actions (kept as-is; you can wire these pills later) */}
        {!isCompleted && canConfirmDelivery && (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => setConfirmVisible(true)}
          >
            <Text style={styles.completeText}>
              {processing ? "Processing…" : "Confirm Delivery"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* CONFIRM MODAL */}
      <Modal transparent visible={confirmVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Confirm Delivery?</Text>
            <Text style={styles.modalText}>
              Please inspect your item before confirming delivery.
              {"\n\n"}
              Once confirmed, the seller will be paid and disputes will no longer
              be available.
            </Text>

            <TouchableOpacity
              style={styles.completeBtn}
              onPress={confirmDelivery}
              disabled={processing}
            >
              <Text style={styles.completeText}>
                {processing ? "Processing…" : "Yes, Confirm Delivery"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setConfirmVisible(false)}>
              <Text style={styles.modalCancel}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

/* ---------------- COMPONENTS ---------------- */

function ReceiptRow({
  label,
  value,
  bold,
  subtle,
}: {
  label: string
  value: string
  bold?: boolean
  subtle?: boolean
}) {
  return (
    <View style={styles.receiptRow}>
      <Text style={[styles.receiptLabel, subtle && { color: "#6B8F7D" }]}>
        {label}
      </Text>
      <Text style={[styles.receiptValue, bold && { fontWeight: "900" }]}>
        {value}
      </Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

  header: {
    height: 85,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    backgroundColor: "#7FAF9B",
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
  },

  image: {
    width: "100%",
    height: 260,
    backgroundColor: "#D6E6DE",
  },

  content: { padding: 16 },

  orderNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: "#6B8F7D",
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F1E17",
    marginTop: 4,
  },

  badge: {
    marginTop: 8,
    backgroundColor: "#7FAF9B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0F1E17",
  },

  receipt: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },

  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  receiptLabel: {
    fontWeight: "700",
    color: "#0F1E17",
  },

  receiptValue: {
    fontWeight: "800",
  },

  receiptDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 8,
  },

  completeBtn: {
    marginTop: 16,
    backgroundColor: "#1F7A63",
    paddingVertical: 14,
    borderRadius: 14,
  },

  completeText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#fff",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },

  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },

  modalText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 20,
  },

  modalCancel: {
    marginTop: 10,
    textAlign: "center",
    fontWeight: "700",
    color: "#999",
  },
})
