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

  /* ---------------- LOAD OPEN DISPUTES (HARDENED) ---------------- */
  useFocusEffect(
    useCallback(() => {
      if (!buyerId) return
      fetchDisputes()
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

      // 🔒 ONLY pull ACTIVE / OPEN disputes (not resolved or closed)
      const { data, error } = await supabase
        .from("disputes")
        .select(`
          id,
          order_id,
          reason,
          status,
          created_at,
          buyer_id
        `)
        .eq("buyer_id", buyerId)
        .not("status", "in", "(resolved_buyer,resolved_seller,closed)")
        .order("created_at", { ascending: false })

      if (error) {
        handleAppError(error, {
          context: "buyer_disputes_fetch",
          fallbackMessage: "Failed to load disputes. Please try again.",
        })
        setDisputes([])
        return
      }

      // 🧠 Safety: always ensure array
      setDisputes(Array.isArray(data) ? data : [])
    } catch (err) {
      handleAppError(err, {
        context: "buyer_disputes_fetch_unknown",
        fallbackMessage: "Something went wrong while loading disputes.",
      })
      setDisputes([])
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- RENDER CARD ---------------- */
  const renderDisputeCard = ({ item }: { item: any }) => {
    const formattedStatus =
      item?.status?.replace(/_/g, " ") ?? "open"

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push(`/buyer-hub/orders/disputes/${item.id}`)
        }
      >
        <Text style={styles.orderText}>
          Order #{item.order_id?.slice(0, 8)}
        </Text>

        <Text style={styles.reasonText}>
          {item.reason || "Dispute opened"}
        </Text>

        <Text style={styles.statusText}>
          Status: {formattedStatus}
        </Text>

        <Text style={styles.dateText}>
          {item.created_at
            ? new Date(item.created_at).toLocaleDateString()
            : ""}
        </Text>
      </TouchableOpacity>
    )
  }

  /* ---------------- UI ---------------- */
  return (
    <View style={styles.screen}>
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
            No open disputes.
          </Text>
          <Text style={styles.subText}>
            Disputes only appear here if a seller opens a dispute on a return
            or order issue. Returns alone will not create a dispute.
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
    backgroundColor: "#EAF4EF",
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
