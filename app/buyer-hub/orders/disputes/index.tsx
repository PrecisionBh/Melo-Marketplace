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


    } catch (err) {
  handleAppError(err, {
    fallbackMessage: "Something went wrong while loading disputes.",
  })
} finally {
  setLoading(false)
}

  }

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.screen}>
      {/* STANDARDIZED MELO HEADER */}
      <AppHeader
        title="Disputes"
        backLabel="Orders"
        backRoute="/buyer-hub/orders"
      />

      {/* BODY */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : !disputes.length ? (
        <View style={styles.center}>
          <Text>No disputes found.</Text>
        </View>
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push(
                  `/buyer-hub/orders/disputes/${item.id}`
                )
              }
            >
              <Text style={styles.orderText}>
                Order #{item.order_id.slice(0, 8)}
              </Text>

              <Text style={styles.reasonText}>
                {item.reason}
              </Text>

              <Text style={styles.statusText}>
                Status: {item.status}
              </Text>

              <Text style={styles.dateText}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF", // 🔥 Unified Melo background
  },

  list: {
    padding: 16,
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
  },

  orderText: {
    fontWeight: "700",
    marginBottom: 4,
  },

  reasonText: {
    fontSize: 14,
    marginBottom: 4,
  },

  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7FAF9B",
  },

  dateText: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
})
