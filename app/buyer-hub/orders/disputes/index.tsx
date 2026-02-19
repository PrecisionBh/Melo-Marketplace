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

export default function BuyerDisputesListScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const buyerId = session?.user?.id

  const [disputes, setDisputes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  /* ---------------- LOAD DISPUTES ---------------- */
  useFocusEffect(
    useCallback(() => {
      if (!buyerId) return
      fetchDisputes()
    }, [buyerId])
  )

  const fetchDisputes = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .eq("buyer_id", buyerId)
        .order("created_at", { ascending: false })

      if (error) {
        handleAppError(error, {
          fallbackMessage: "Failed to load disputes. Please try again.",
        })
        return
      }

      // 🔥 CRITICAL: Actually store the fetched disputes (this was missing before)
      setDisputes(data || [])
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Something went wrong while loading disputes.",
      })
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- RENDER CARD ---------------- */
  const renderDisputeCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push(`/buyer-hub/orders/disputes/${item.id}`)
      }
    >
      <Text style={styles.orderText}>
        Order #{item.order_id.slice(0, 8)}
      </Text>

      <Text style={styles.reasonText}>
        {item.reason}
      </Text>

      <Text style={styles.statusText}>
        Status: {item.status.replace(/_/g, " ")}
      </Text>

      <Text style={styles.dateText}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  )

  /* ---------------- UI ---------------- */
  return (
    <View style={styles.screen}>
      {/* MELO HEADER */}
      <AppHeader
        title="Disputes"
        backLabel="Orders"
        backRoute="/buyer-hub/orders"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : !disputes.length ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            No disputes found.
          </Text>
          <Text style={styles.subText}>
            You can open a dispute from an order if there is an issue
            with the item, return, or delivery.
          </Text>
        </View>
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderDisputeCard}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF", // Melo theme
  },

  list: {
    padding: 16,
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },

  orderText: {
    fontWeight: "800",
    marginBottom: 4,
    fontSize: 14,
  },

  reasonText: {
    fontSize: 14,
    marginBottom: 4,
    color: "#111827",
  },

  statusText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7FAF9B",
    textTransform: "capitalize",
  },

  dateText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },

  subText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 18,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
})
