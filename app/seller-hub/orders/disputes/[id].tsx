import { Ionicons } from "@expo/vector-icons"
import {
    useFocusEffect,
    useLocalSearchParams,
    useRouter,
} from "expo-router"
import { useCallback, useState } from "react"
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

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
  seller_responded_at: string | null
  resolved_at: string | null
  resolution: string | null
  admin_notes: string | null
}

export default function SellerDisputeDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()
  const user = session?.user

  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [loading, setLoading] = useState(true)

  /* 🔁 REFRESH EVERY TIME SCREEN GAINS FOCUS */
  useFocusEffect(
    useCallback(() => {
      if (id && user) {
        fetchDispute()
      }
    }, [id, user])
  )

  const fetchDispute = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .eq("id", id)
        .single()

      if (error || !data) {
        setLoading(false)
        return
      }

      if (data.seller_id !== user?.id) {
        router.back()
        return
      }

      setDispute(data)
    } catch (err) {
      console.error("Seller dispute fetch error:", err)
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
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
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Dispute Details</Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.orderText}>
          Order #{dispute.order_id.slice(0, 8)}
        </Text>

        {/* STATUS BADGE */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(dispute.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {dispute.status.replace("_", " ")}
          </Text>
        </View>

        {/* RESPOND BUTTON — ONLY IF ISSUE OPEN */}
        {dispute.status === "issue_open" && (
          <TouchableOpacity
            style={styles.respondBtn}
            onPress={() =>
              router.push(
                `/seller-hub/orders/${dispute.order_id}/dispute-issue`
              )
            }
          >
            <Text style={styles.respondText}>
              Respond to Dispute
            </Text>
          </TouchableOpacity>
        )}

        {/* BUYER ISSUE */}
        <Text style={styles.sectionTitle}>Buyer Issue</Text>
        <View style={styles.card}>
          <Text style={styles.reason}>{dispute.reason}</Text>
          <Text style={styles.description}>
            {dispute.description}
          </Text>
        </View>

        {/* EVIDENCE */}
        {dispute.evidence_urls?.length ? (
          <>
            <Text style={styles.sectionTitle}>Evidence</Text>
            <ScrollView horizontal>
              {dispute.evidence_urls.map((url) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={styles.image}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* TIMESTAMPS */}
        <Text style={styles.sectionTitle}>Submitted</Text>
        <Text style={styles.info}>
          {new Date(dispute.created_at).toLocaleString()}
        </Text>

        {dispute.seller_responded_at && (
          <>
            <Text style={styles.sectionTitle}>
              Seller Responded
            </Text>
            <Text style={styles.info}>
              {new Date(
                dispute.seller_responded_at
              ).toLocaleString()}
            </Text>
          </>
        )}

        {dispute.resolution && (
          <>
            <Text style={styles.sectionTitle}>
              Resolution
            </Text>
            <Text style={styles.info}>
              {dispute.resolution.replace("_", " ")}
            </Text>
          </>
        )}

        {dispute.admin_notes && (
          <>
            <Text style={styles.sectionTitle}>
              Admin Notes
            </Text>
            <Text style={styles.info}>
              {dispute.admin_notes}
            </Text>
          </>
        )}

        {dispute.resolved_at && (
          <>
            <Text style={styles.sectionTitle}>
              Resolved At
            </Text>
            <Text style={styles.info}>
              {new Date(
                dispute.resolved_at
              ).toLocaleString()}
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F7F8" },

  header: {
    height: 60,
    backgroundColor: "#7FAF9B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  container: {
    padding: 16,
    paddingBottom: 80,
  },

  orderText: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },

  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  sectionTitle: {
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 8,
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
  },

  reason: {
    fontWeight: "800",
    marginBottom: 6,
  },

  description: {
    color: "#444",
  },

  image: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 8,
  },

  info: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  respondBtn: {
    marginTop: 16,
    backgroundColor: "#1F7A63",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  respondText: {
    color: "#fff",
    fontWeight: "900",
  },
})
