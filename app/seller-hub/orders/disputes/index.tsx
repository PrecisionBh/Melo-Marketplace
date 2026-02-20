import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

type Dispute = {
  id: string
  order_id: string
  status: string
  reason: string
  created_at: string
}

export default function SellerDisputesPage() {
  const router = useRouter()
  const { session } = useAuth()
  const sellerId = session?.user?.id

  const [disputes, setDisputes] = useState<Dispute[]>([])
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

      // 🔥 ONLY PULL ACTIVE (OPEN) DISPUTES
      const { data, error } = await supabase
        .from("disputes")
        .select("id, order_id, status, reason, created_at")
        .eq("seller_id", sellerId)
        .in("status", ["return_processing", "under_review"])
        .order("created_at", { ascending: false })

      if (error) throw error

      setDisputes(data ?? [])
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
      case "return_processing":
        return "#EB5757" // 🔴 Active dispute / frozen escrow
      case "under_review":
        return "#2F80ED" // 🔵 Admin review
      case "resolved_buyer":
        return "#27AE60"
      case "resolved_seller":
        return "#27AE60"
      default:
        return "#999"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "return_processing":
        return "Active Dispute"
      case "under_review":
        return "Under Review"
      case "resolved_buyer":
        return "Resolved (Buyer)"
      case "resolved_seller":
        return "Resolved (Seller)"
      default:
        return status.replace(/_/g, " ")
    }
  }

  const renderItem = ({ item }: { item: Dispute }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push(`/seller-hub/orders/disputes/${item.id}`)
      }
    >
      <View style={styles.row}>
        <Text style={styles.orderText}>
          Order #{item.order_id ? item.order_id.slice(0, 8) : "N/A"}
        </Text>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.reason}>
        {item.reason ?? "No reason provided"}
      </Text>

      <Text style={styles.date}>
        {item.created_at
          ? new Date(item.created_at).toLocaleDateString()
          : ""}
      </Text>
    </TouchableOpacity>
  )

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
        title="Active Disputes"
        backLabel="Orders"
        backRoute="/seller-hub/orders"
      />

      {disputes.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            No active disputes.
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

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  orderText: {
    fontWeight: "800",
    fontSize: 14,
    color: "#0F1E17",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  statusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  reason: {
    marginTop: 8,
    fontWeight: "600",
    color: "#0F1E17",
  },

  date: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B8F7D",
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B8F7D",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
})
