import {
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native"

const STATUS_CONFIG: Record<
  string,
  {
    label: string
    bg: string
    text: string
  }
> = {
  cancelled: {
    label: "Cancelled",
    bg: "#E5E7EB",
    text: "#374151",
  },
  paid: {
    label: "Awaiting Shipment",
    bg: "#FEF3C7",
    text: "#92400E",
  },
  shipped: {
    label: "Shipped",
    bg: "#DBEAFE",
    text: "#1D4ED8",
  },
  in_transit: {
    label: "In Transit",
    bg: "#E0E7FF",
    text: "#4338CA",
  },
  out_for_delivery: {
    label: "Out For Delivery",
    bg: "#DDD6FE",
    text: "#6D28D9",
  },
  delivered: {
    label: "Delivered",
    bg: "#CCFBF1",
    text: "#0F766E",
  },
  completed: {
    label: "Completed",
    bg: "#DCFCE7",
    text: "#15803D",
  },
  return_started: {
    label: "Return Started",
    bg: "#FEF3C7",
    text: "#92400E",
  },
  return_processing: {
    label: "Return Processing",
    bg: "#FECACA",
    text: "#991B1B",
  },
  disputed: {
    label: "Disputed",
    bg: "#FECACA",
    text: "#991B1B",
  },
}

export default function OrderSummaryCard({
  order,
}: {
  order: any
}) {
  const derivedStatus = (() => {
    if (order.status === "cancelled") return "cancelled"
    if (order.is_disputed) return "disputed"

    if (
      order.status === "completed" ||
      order.status === "return_started" ||
      order.status === "return_processing"
    ) {
      return order.status
    }

    if (order.tracking_status === "delivered")
      return "delivered"

    if (order.tracking_status === "out_for_delivery")
      return "out_for_delivery"

    if (order.tracking_status === "in_transit")
      return "in_transit"

    return order.status
  })()

  const cfg =
    STATUS_CONFIG[derivedStatus] ?? {
      label: "Unknown",
      bg: "#E5E7EB",
      text: "#374151",
    }

  const image =
    order.listing_snapshot?.image ??
    order.listing_snapshot?.image_urls?.[0] ??
    order.image_url

  const title =
    order.listing_snapshot?.title ??
    "Order"

  const quantity = order.quantity ?? 1

  // 🔥 SMART SIZE HANDLING
  const size =
    order.size ??
    order.listing_snapshot?.size ??
    null

    const subcategory =
  order.listing_snapshot?.subcategory ?? null

  const total =
    (order.amount_cents ?? 0) / 100

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={styles.image}
          />
        ) : (
          <View style={styles.placeholder} />
        )}

        <View style={styles.info}>
          <Text
            style={styles.title}
            numberOfLines={2}
          >
            {title}
          </Text>

          <Text style={styles.orderNum}>
            Order #
            {order.public_order_number ?? order.id}
          </Text>

          <Text style={styles.meta}>
  Qty: {quantity}
  {size ? ` • Size: ${size}` : ""}
  {subcategory
    ? ` • ${subcategory.replace(/_/g, " ")}`
    : ""}
</Text>

          <Text style={styles.price}>
            ${total.toFixed(2)}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.statusPill,
          { backgroundColor: cfg.bg },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            { color: cfg.text },
          ]}
        >
          {cfg.label}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 16,
    marginBottom: 16,
  },

  topRow: {
    flexDirection: "row",
  },

  image: {
    width: 88,
    height: 88,
    borderRadius: 18,
    marginRight: 14,
  },

  placeholder: {
    width: 88,
    height: 88,
    borderRadius: 18,
    backgroundColor: "#EEE",
    marginRight: 14,
  },

  info: {
    flex: 1,
    justifyContent: "center",
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    marginBottom: 4,
  },

  orderNum: {
    fontSize: 13,
    color: "#777",
    marginBottom: 4,
  },

  meta: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },

  price: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },

  statusPill: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },
})