import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { AdminGate } from "@/lib/adminGate"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type Dispute = {
  id: string
  order_id: string
  buyer_id: string
  seller_id: string
  reason: string
  description: string
  evidence_urls: string[] | null
  status: string
  created_at: string
}

/* ---------------- SCREEN ---------------- */

function AdminDisputeDetailScreen() {
  const { disputeId } = useLocalSearchParams<{ disputeId: string }>()
  const router = useRouter()

  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (disputeId) loadDispute()
  }, [disputeId])

  const loadDispute = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("disputes")
      .select("*")
      .eq("id", disputeId)
      .single()

    if (!error) {
      setDispute(data)
    }

    setLoading(false)
  }

  const updateStatus = async (status: "resolved" | "refunded") => {
    Alert.alert(
      status === "resolved" ? "Resolve Dispute" : "Refund Buyer",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            await supabase
              .from("disputes")
              .update({
                status,
                resolved_at: new Date().toISOString(),
              })
              .eq("id", dispute!.id)

            router.back()
          },
        },
      ]
    )
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  if (!dispute) {
    return (
      <View style={styles.center}>
        <Text>Dispute not found.</Text>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispute Review</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Order ID</Text>
          <Text style={styles.value}>{dispute.order_id}</Text>

          <Text style={styles.label}>Reason</Text>
          <Text style={styles.value}>{dispute.reason}</Text>

          <Text style={styles.label}>Buyer Message</Text>
          <Text style={styles.value}>{dispute.description}</Text>

          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>
            {dispute.status.replace("_", " ").toUpperCase()}
          </Text>
        </View>

        {/* EVIDENCE */}
        {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidence</Text>

            {dispute.evidence_urls.map((url, idx) => (
              <Image
                key={idx}
                source={{ uri: url }}
                style={styles.image}
              />
            ))}
          </View>
        )}

        {/* ACTIONS */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() =>
              router.push(
                `/messages?userId=${dispute.buyer_id}`
              )
            }
          >
            <Text style={styles.primaryText}>Message Buyer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() =>
              router.push(
                `/messages?userId=${dispute.seller_id}`
              )
            }
          >
            <Text style={styles.primaryText}>Message Seller</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => updateStatus("resolved")}
          >
            <Text style={styles.successText}>Resolve Dispute</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => updateStatus("refunded")}
          >
            <Text style={styles.dangerText}>Refund Buyer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

/* ---------------- EXPORT ---------------- */

export default function AdminDisputeDetail() {
  return (
    <AdminGate>
      <AdminDisputeDetailScreen />
    </AdminGate>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    paddingTop: 60,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "#7FAF9B",
  },

  back: {
    color: "#0F1E17",
    fontWeight: "700",
    marginBottom: 4,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  content: { padding: 16, paddingBottom: 120 },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
  },

  label: {
    marginTop: 12,
    fontWeight: "800",
    color: "#0F1E17",
  },

  value: {
    marginTop: 4,
    color: "#333",
  },

  section: { marginTop: 24 },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },

  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
  },

  actions: { marginTop: 30 },

  primaryBtn: {
    backgroundColor: "#0F1E17",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },

  primaryText: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
  },

  successBtn: {
    backgroundColor: "#27AE60",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },

  successText: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
  },

  dangerBtn: {
    backgroundColor: "#EB5757",
    padding: 14,
    borderRadius: 14,
  },

  dangerText: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
  },
})
