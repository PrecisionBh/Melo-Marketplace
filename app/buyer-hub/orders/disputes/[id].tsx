import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native"


import AppHeader from "@/components/app-header"
import { handleAppError } from "../../../../lib/errors/appError"
import { supabase } from "../../../../lib/supabase"


export default function DisputeDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [dispute, setDispute] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetchDispute()
  }, [id])

  const fetchDispute = async () => {
  const { data, error } = await supabase
    .from("disputes")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    handleAppError(error, {
      fallbackMessage: "Failed to load dispute details.",
    })
    setLoading(false)
    return
  }

  if (data) {
    setDispute(data)
  }

  setLoading(false)
}


  const getStatusColor = (status: string) => {
    switch (status) {
      case "issue_open":
        return "#E74C3C" // red
      case "seller_responded":
        return "#F39C12" // orange
      case "under_review":
        return "#2980B9" // blue
      case "resolved_buyer":
        return "#27AE60" // green
      case "resolved_seller":
        return "#2ECC71" // green alt
      default:
        return "#7F8C8D"
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
    <View style={{ flex: 1 }}>
      {/* HEADER */}
      <AppHeader
  title="Dispute Details"
  backRoute="/buyer-hub/orders"
/>


      <ScrollView style={styles.container}>
        <Text style={styles.orderRef}>
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
            {dispute.status.replace(/_/g, " ").toUpperCase()}
          </Text>
        </View>

        <Text style={styles.label}>Reason</Text>
        <Text style={styles.value}>{dispute.reason}</Text>

        <Text style={styles.label}>Description</Text>
        <Text style={styles.value}>{dispute.description}</Text>

        <Text style={styles.label}>Submitted</Text>
        <Text style={styles.value}>
          {new Date(dispute.created_at).toLocaleString()}
        </Text>

        {dispute.evidence_urls?.length > 0 && (
          <>
            <Text style={styles.label}>Evidence</Text>
            <View style={styles.imageRow}>
              {dispute.evidence_urls.map(
                (url: string, idx: number) => (
                  <Image
                    key={idx}
                    source={{ uri: url }}
                    style={styles.image}
                  />
                )
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "#7FAF9B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  container: {
    flex: 1,
    backgroundColor: "#F6F7F8",
    padding: 16,
  },
  orderRef: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  statusText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  label: {
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  value: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
  },
  imageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
})
