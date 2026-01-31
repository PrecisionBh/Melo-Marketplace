import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
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

/* ---------------- TYPES ---------------- */

type Dispute = {
  id: string
  order_id: string
  reason: string
  status: string
  created_at: string
}

/* ---------------- SCREEN ---------------- */

export default function SellerDisputesScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const user = session?.user

  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadDisputes()
  }, [user])

  const loadDisputes = async () => {
    setLoading(true)

    const { data } = await supabase
      .from("disputes")
      .select("id, order_id, reason, status, created_at")
      .eq("seller_id", user!.id)
      .order("created_at", { ascending: false })

    setDisputes(data ?? [])
    setLoading(false)
  }

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#E8F5EE" />
          <Text style={styles.backText}>Seller Hub</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Disputes</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} />
      ) : disputes.length === 0 ? (
        <View style={styles.content}>
          <Ionicons
            name="checkmark-circle-outline"
            size={48}
            color="#7FAF9B"
          />

          <Text style={styles.title}>No Active Disputes</Text>

          <Text style={styles.subtitle}>
            You don’t have any disputes right now. If a buyer opens a
            dispute on one of your orders, it will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push(
                  `/seller-hub/orders/disputes-issue?orderId=${item.order_id}`
                )
              }
            >
              <View style={styles.row}>
                <Text style={styles.reason}>{item.reason}</Text>
                <StatusBadge status={item.status} />
              </View>

              <Text style={styles.meta}>
                Order #{item.order_id.slice(0, 8)}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

/* ---------------- COMPONENTS ---------------- */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "#F2C94C",
    under_review: "#56CCF2",
    resolved: "#27AE60",
    refunded: "#EB5757",
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: map[status] ?? "#BDBDBD" },
      ]}
    >
      <Text style={styles.badgeText}>
        {status.replace("_", " ").toUpperCase()}
      </Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

  header: {
    paddingTop: 60,
    paddingBottom: 14,
    alignItems: "center",
    backgroundColor: "#7FAF9B",
  },

  backBtn: {
    position: "absolute",
    left: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  backText: {
    marginLeft: 6,
    color: "#E8F5EE",
    fontWeight: "600",
    fontSize: 13,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#E8F5EE",
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  title: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B8F7D",
    textAlign: "center",
    lineHeight: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  reason: {
    fontWeight: "800",
    color: "#0F1E17",
    flex: 1,
    marginRight: 8,
  },

  meta: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B8F7D",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
})
