import { supabase } from "@/lib/supabase"
import { useState } from "react"
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

export default function BuyerActions({
  order,
  refreshOrder,
  onConfirmDelivery,
  onStartReturn,
}: {
  order: any
  refreshOrder?: () => void
  onConfirmDelivery?: () => void
  onStartReturn?: () => void
}) {
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resultModal, setResultModal] = useState<
    "success" | "error" | null
  >(null)

  const status = order.status
  const trackingStatus = order.tracking_status?.toLowerCase()

  const hasShipped =
    trackingStatus === "in_transit" ||
    trackingStatus === "out_for_delivery" ||
    trackingStatus === "delivered"

  const isDelivered = trackingStatus === "delivered"
  const isCompleted = status === "completed"
  const isCancelled = status === "cancelled"
  const isPendingPayment = status === "pending_payment"

  const deliveredAt = order.delivered_at
    ? new Date(order.delivered_at)
    : null

  const now = new Date()

  const returnDeadline = deliveredAt
    ? new Date(
        deliveredAt.getTime() +
          2 * 24 * 60 * 60 * 1000
      )
    : null

  const returnWindowActive =
    returnDeadline &&
    now < returnDeadline &&
    isDelivered

  const hoursRemaining = returnDeadline
    ? Math.max(
        0,
        Math.floor(
          (returnDeadline.getTime() -
            now.getTime()) /
            (1000 * 60 * 60)
        )
      )
    : 0

  /* ---------------- MESSAGE ---------------- */

  const getBuyerMessage = () => {
    if (isCancelled) {
      return {
        title: "Order Cancelled",
        sub: "Your order has been refunded.",
        type: "error",
      }
    }

    if (isCompleted) {
      return {
        title: "Order Complete",
        sub: "Transaction finished successfully.",
        type: "success",
      }
    }

    if (isPendingPayment) {
      return {
        title: "Awaiting Payment",
        sub: "Complete your payment to proceed.",
        type: "notice",
      }
    }

    if (status === "paid" && !hasShipped) {
      return {
        title: "Order Confirmed",
        sub: "Seller has not shipped yet. You may cancel if needed.",
        type: "notice",
      }
    }

    if (hasShipped && !isDelivered) {
      return {
        title: "In Transit",
        sub: "Your order is on the way.",
        type: "notice",
      }
    }

    if (isDelivered && returnWindowActive) {
      return {
        title: "Delivered",
        sub: `${hoursRemaining}h remaining to confirm or return.`,
        type: "notice",
      }
    }

    return {
      title: "Processing Order",
      sub: "Monitor your order status.",
      type: "notice",
    }
  }

  const message = getBuyerMessage()

  /* ---------------- CANCEL ---------------- */

  const canCancel =
    status === "paid" &&
    !hasShipped &&
    !order.is_disputed

  const handleCancel = async () => {
    try {
      setLoading(true)

      const { error } =
        await supabase.functions.invoke(
          "cancel-order-refund",
          {
            body: { order_id: order.id },
          }
        )

      if (error) throw error

      setResultModal("success")
      refreshOrder?.()
    } catch (err) {
      console.log(err)
      setResultModal("error")
    } finally {
      setLoading(false)
      setConfirmVisible(false)
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Buyer Actions
      </Text>

      {/* 🔥 MESSAGE */}
      <View
        style={[
          styles.noticeBox,
          message.type === "success" &&
            styles.successBox,
          message.type === "error" &&
            styles.errorBox,
        ]}
      >
        <Text
          style={[
            styles.noticeTitle,
            message.type === "success" &&
              styles.successTitle,
            message.type === "error" &&
              styles.errorTitle,
          ]}
        >
          {message.title}
        </Text>

        <Text style={styles.noticeSub}>
          {message.sub}
        </Text>
      </View>

      {/* 🔥 CANCEL BUTTON */}
      {canCancel && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setConfirmVisible(true)}
        >
          <Text style={styles.secondaryText}>
            Cancel Order
          </Text>
        </TouchableOpacity>
      )}

      {/* 🔥 DELIVERY / RETURN */}
      {returnWindowActive && (
        <>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onConfirmDelivery}
          >
            <Text style={styles.primaryText}>
              Confirm Delivery
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onStartReturn}
          >
            <Text style={styles.secondaryText}>
              Start Return
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* 🔥 CONFIRM CANCEL MODAL */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Cancel Order?
            </Text>

            <Text style={styles.modalSub}>
              This will refund the order.
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleCancel}
            >
              <Text style={styles.primaryText}>
                Yes, Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setConfirmVisible(false)}
            >
              <Text style={styles.secondaryText}>
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🔥 LOADING */}
      <Modal visible={loading} transparent>
        <View style={styles.modalWrap}>
          <ActivityIndicator size="large" />
        </View>
      </Modal>

      {/* 🔥 RESULT MODAL */}
      <Modal visible={!!resultModal} transparent>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {resultModal === "success"
                ? "Order Cancelled"
                : "Failed to Cancel"}
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setResultModal(null)}
            >
              <Text style={styles.primaryText}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 16,
    marginBottom: 16,
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 14,
  },

  noticeBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },

  noticeTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
    color: "#2563EB",
  },

  noticeSub: {
    fontSize: 13,
    color: "#1D4ED8",
  },

  successBox: { backgroundColor: "#ECFDF5" },
  successTitle: { color: "#16A34A" },

  errorBox: { backgroundColor: "#FEE2E2" },
  errorTitle: { color: "#DC2626" },

  primaryBtn: {
    backgroundColor: "#D97732",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },

  primaryText: {
    color: "#fff",
    fontWeight: "800",
  },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#D97732",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  secondaryText: {
    color: "#D97732",
    fontWeight: "800",
  },

  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 18,
    width: "80%",
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  modalSub: {
    fontSize: 13,
    marginBottom: 16,
  },
})