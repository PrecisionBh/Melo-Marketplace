import { Ionicons } from "@expo/vector-icons"
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

import { useAuth } from "@/context/AuthContext"
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
        console.error("🔥 Error fetching disputes:", error)
        return
      }

      setDisputes(data ?? [])
    } catch (err) {
      console.error("🔥 Unexpected dispute fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Disputes</Text>

        <View style={{ width: 32 }} />
      </View>

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
    backgroundColor: "#F6F7F8",
  },

  header: {
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#7FAF9B",
    alignItems: "center",
    justifyContent: "center",
  },

  backBtn: {
    position: "absolute",
    left: 16,
    bottom: 16,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
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
