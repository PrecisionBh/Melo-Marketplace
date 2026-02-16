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
      }
    }, [sellerId])
  )

  const fetchDisputes = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("disputes")
        .select("id, order_id, status, reason, created_at")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })

      if (!error && data) {
        setDisputes(data)
      }
    } catch (err) {
      console.error("Seller disputes fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "issue_open":
        return "#EB5757"
      case "seller_responded":
        return "#F2C94C"
      case "under_review":
        return "#2F80ED"
      case "resolved_buyer":
      case "resolved_seller":
        return "#27AE60"
      default:
        return "#999"
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
          Order #{item.order_id.slice(0, 8)}
        </Text>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {item.status.replace("_", " ")}
          </Text>
        </View>
      </View>

      <Text style={styles.reason}>{item.reason}</Text>

      <Text style={styles.date}>
        {new Date(item.created_at).toLocaleDateString()}
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
      {/* STANDARD MELO HEADER */}
      <AppHeader
        title="Disputes"
        backLabel="Orders"
        backRoute="/seller-hub/orders"
      />

      {disputes.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No disputes found.</Text>
        </View>
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        />
      )}
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF", // 🌿 Melo global background
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
