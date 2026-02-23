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

type DisputeStatus =
  | "issue_open"
  | "disputed"
  | "return_processing"
  | "under_review"
  | "resolved_buyer"
  | "resolved_seller"
  | string

type DisputeRow = {
  id: string
  order_id: string
  buyer_id: string
  status: DisputeStatus
  reason: string | null
  created_at: string
  opened_by: "buyer" | "seller" | null
  orders?: {
    id: string
    amount_cents: number | null
    seller_id: string | null
    image_url: string | null
    listing_snapshot: {
      title?: string | null
      image_url?: string | null
    } | null
  } | null
}

export default function BuyerDisputesListScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const buyerId = session?.user?.id

  const [disputes, setDisputes] = useState<DisputeRow[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      if (buyerId) {
        fetchDisputes()
      } else {
        setDisputes([])
        setLoading(false)
      }
    }, [buyerId])
  )

  const fetchDisputes = async () => {
    try {
      if (!buyerId) {
        setDisputes([])
        setLoading(false)
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from("disputes")
        .select(`
          id,
          order_id,
          buyer_id,
          status,
          reason,
          created_at,
          opened_by,
          orders:orders (
            id,
            amount_cents,
            seller_id,
            image_url,
            listing_snapshot
          )
        `)
        .eq("buyer_id", buyerId)
        .in("status", [
          "issue_open",
          "disputed",
          "return_processing",
          "under_review",
        ])
        .order("created_at", { ascending: false })

      if (error) throw error

      const rows: DisputeRow[] = (data ?? []).map((d: any) => d)
      setDisputes(rows)
    } catch (err) {
      handleAppError(err, {
        context: "buyer_disputes_fetch",
        fallbackMessage: "Failed to load disputes.",
      })
      setDisputes([])
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- STATUS COLOR ---------------- */
  const getStatusColor = (status: string) => {
    switch (status) {
      case "issue_open":
        return "#EB5757" // red
      case "disputed":
        return "#9B51E0" // purple
      case "return_processing":
        return "#F2994A" // orange
      case "under_review":
        return "#2F80ED" // blue
      default:
        return "#999"
    }
  }

  /* ---------------- STATUS LABEL ---------------- */
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "issue_open":
        return "DISPUTE OPEN"
      case "disputed":
        return "ESCALATED"
      case "return_processing":
        return "RETURN DISPUTE"
      case "under_review":
        return "UNDER REVIEW"
      default:
        return status.replace(/_/g, " ").toUpperCase()
    }
  }

  /* ---------------- BUYER-SAFE HINT (CLEAN + NO ERRORS) ---------------- */
  const getHint = (item: DisputeRow) => {
    const { status, opened_by } = item

    // 🧊 Escrow is frozen immediately in your system
    if (opened_by === "seller" && status === "return_processing") {
      return "Seller disputed your return — refund paused and under review"
    }

    // Buyer opened dispute (they already submitted evidence at creation)
    if (opened_by === "buyer" && status === "issue_open") {
      return "Dispute submitted — awaiting seller response (escrow frozen)"
    }

    // Seller has responded → admin review phase
    if (status === "under_review") {
      return "Under admin review — both parties submitted evidence"
    }

    // Escalated dispute state
    if (status === "disputed") {
      return "Escrow frozen — dispute escalated for review"
    }

    // Return dispute active
    if (status === "return_processing") {
      return "Return under review — escrow frozen"
    }

    return "Dispute active — escrow frozen"
  }

  /* ---------------- CARD (MATCHES SELLER UI) ---------------- */
  const renderItem = ({ item }: { item: DisputeRow }) => {
    const order = item.orders

    const imageUri =
      order?.image_url ||
      order?.listing_snapshot?.image_url ||
      "https://via.placeholder.com/150"

    const title =
      order?.listing_snapshot?.title ??
      (item.order_id ? `Order #${item.order_id.slice(0, 8)}` : "Order")

    const sellerShort = order?.seller_id
      ? order.seller_id.slice(0, 8)
      : "Unknown"

    const amount = ((order?.amount_cents ?? 0) / 100).toFixed(2)

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push(`/buyer-hub/orders/disputes/${item.id}`)
        }
      >
        {/* IMAGE */}
        <Image source={{ uri: imageUri }} style={styles.image} />

        {/* INFO */}
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>

          <Text style={styles.subText}>
            Seller: {sellerShort}
          </Text>

          <Text style={styles.subText}>${amount}</Text>

          <Text style={styles.issueHint}>
            {getHint(item)}
          </Text>

          {!!item.reason && (
            <Text style={styles.reason} numberOfLines={1}>
              Reason: {item.reason}
            </Text>
          )}
        </View>

        {/* STATUS BADGE */}
        <View
          style={[
            styles.badge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.badgeText}>
            {getStatusLabel(item.status)}
          </Text>
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
      <AppHeader
        title="Disputes"
        backLabel="Orders"
        backRoute="/buyer-hub/orders"
      />

      {disputes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle-outline" size={40} color="#7FAF9B" />
          <Text style={styles.emptyText}>No active disputes.</Text>
          <Text style={styles.helperText}>
            Disputes appear here when an issue is opened or a return is disputed.
          </Text>
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