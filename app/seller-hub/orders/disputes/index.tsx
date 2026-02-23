import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

type DisputeStatus = "return_processing" | "disputed" | "issue_open" | string

type DisputeRow = {
  id: string
  order_id: string
  seller_id: string
  status: DisputeStatus
  reason: string | null
  created_at: string
  opened_by?: "buyer" | "seller" | null
  seller_responded_at?: string | null
  resolved_at?: string | null
  orders?: {
    id: string
    amount_cents: number | null
    buyer_id: string | null
    image_url: string | null
    listing_snapshot: {
      title?: string | null
      image_url?: string | null
    } | null
  } | null
}

export default function SellerDisputesPage() {
  const router = useRouter()
  const { session } = useAuth()
  const sellerId = session?.user?.id

  const [disputes, setDisputes] = useState<DisputeRow[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      if (sellerId) {
        fetchDisputes()
      } else {
        setDisputes([])
        setLoading(false)
      }
    }, [sellerId])
  )

  const fetchDisputes = async () => {
    try {
      if (!sellerId) {
        setDisputes([])
        setLoading(false)
        return
      }

      setLoading(true)

      // ✅ Pull active disputes + embed the related order to match card UI
      const { data, error } = await supabase
        .from("disputes")
        .select(`
  id,
  order_id,
  seller_id,
  status,
  reason,
  created_at,
  opened_by,
  seller_responded_at,
  resolved_at,
  orders:orders (
    id,
    amount_cents,
    buyer_id,
    image_url,
    listing_snapshot
  )
        `
        )
        .eq("seller_id", sellerId)
        .in("status", [
  "return_processing",
  "disputed",
  "issue_open",
  "under_review",
])
        .order("created_at", { ascending: false })

      if (error) throw error

const rows: DisputeRow[] = (data ?? []).map((d: any) => d)
setDisputes(rows)

    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load disputes.",
      })
      setDisputes([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "issue_open":
        return "#EB5757" // red
      case "disputed":
        return "#9B51E0" // purple
      case "return_processing":
        return "#F2994A" // orange
      default:
        return "#999"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "issue_open":
        return "DISPUTE OPEN"
      case "disputed":
        return "DISPUTED"
      case "return_processing":
        return "RETURN"
      default:
        return status.replace(/_/g, " ").toUpperCase()
    }
  }

  const getHint = (item: DisputeRow) => {
  // 🟢 Fully resolved — no action ever
  if (item.resolved_at) {
    return "Dispute resolved — no action required"
  }

  // 🔴 Buyer opened dispute and seller has NOT responded
  if (
    item.opened_by === "buyer" &&
    !item.seller_responded_at &&
    item.status !== "under_review"
  ) {
    return "Buyer reported an issue — action required"
  }

  // 🟠 Seller already responded OR under review
  if (
    item.status === "under_review" ||
    item.seller_responded_at
  ) {
    return "Under review — awaiting decision"
  }

  // 🟡 Seller opened dispute (return abuse case)
  if (item.opened_by === "seller") {
    return "Return disputed — escrow frozen"
  }

  // 🧊 Escrow frozen states (but no immediate action)
  if (item.status === "return_processing") {
    return "Return in progress — escrow frozen"
  }

  if (item.status === "disputed") {
    return "Dispute active — escrow frozen"
  }

  return "Monitoring dispute status"
}

  const renderItem = ({ item }: { item: DisputeRow }) => {
    const order = item.orders
    const imageUri =
      order?.image_url ||
      order?.listing_snapshot?.image_url ||
      "https://via.placeholder.com/150"

    const title =
      order?.listing_snapshot?.title ??
      (item.order_id ? `Order #${item.order_id.slice(0, 8)}` : "Order")

    const buyerShort = order?.buyer_id ? order.buyer_id.slice(0, 8) : "Unknown"
    const amount = ((order?.amount_cents ?? 0) / 100).toFixed(2)

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/seller-hub/orders/disputes/${item.id}`)}
      >
        {/* IMAGE */}
        <Image source={{ uri: imageUri }} style={styles.image} />

        {/* INFO */}
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>

          <Text style={styles.subText}>Buyer: {buyerShort}</Text>

          <Text style={styles.subText}>${amount}</Text>

          <Text style={styles.issueHint}>{getHint(item)}</Text>

          {!!item.reason && (
            <Text style={styles.reason} numberOfLines={1}>
              Reason: {item.reason}
            </Text>
          )}
        </View>

        {/* STATUS BADGE */}
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.badgeText}>{getStatusLabel(item.status)}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Disputes" backLabel="Orders" backRoute="/seller-hub/orders" />

      {disputes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle-outline" size={40} color="#7FAF9B" />
          <Text style={styles.emptyText}>No active disputes.</Text>
          <Text style={styles.helperText}>Any open disputes will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
    textAlign: "center",
  },

  helperText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B8F7D",
    textAlign: "center",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    alignItems: "center",
  },

  image: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#D6E6DE",
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F1E17",
  },

  subText: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B8F7D",
    fontWeight: "600",
  },

  issueHint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "800",
    color: "#C0392B",
  },

  reason: {
    marginTop: 6,
    fontSize: 11,
    color: "#6B8F7D",
    fontWeight: "700",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 6,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#fff",
  },
})