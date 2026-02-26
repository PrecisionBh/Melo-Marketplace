import { useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

type DisputeRow = {
  id: string
  order_id: string
  reason: string | null
  description: string | null
  buyer_response: string | null
  seller_response: string | null
  buyer_evidence_urls: string[] | null
  seller_evidence_urls: string[] | null
  evidence_urls: string[] | null
  opened_by: "buyer" | "seller" | null
  created_at: string
  orders?: {
    public_order_number: string | null
  } | null
}

export default function EvidenceScreen() {
  const { id } = useLocalSearchParams()
  const [loading, setLoading] = useState(true)
  const [dispute, setDispute] = useState<DisputeRow | null>(null)

  useEffect(() => {
    if (id) {
      fetchDispute()
    }
  }, [id])

  const fetchDispute = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("disputes")
        .select(`
          *,
          orders:order_id (
            public_order_number
          )
        `)
        .eq("id", id)
        .maybeSingle()

      if (error) throw error
      setDispute(data)
    } catch (err) {
      handleAppError(err, {
        context: "admin_fetch_evidence",
        fallbackMessage: "Failed to load dispute evidence.",
      })
    } finally {
      setLoading(false)
    }
  }

  const renderImages = (urls: string[] | null) => {
    if (!urls || urls.length === 0) {
      return (
        <Text style={styles.noEvidence}>
          No evidence uploaded.
        </Text>
      )
    }

    return urls.map((url, index) => (
      <Image
        key={`${url}-${index}`}
        source={{ uri: url }}
        style={styles.image}
        resizeMode="cover"
      />
    ))
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>
          Loading evidence...
        </Text>
      </View>
    )
  }

  if (!dispute) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Dispute not found.
        </Text>
      </View>
    )
  }

  const publicOrderNumber =
    dispute.orders?.public_order_number || dispute.order_id

  return (
    <View style={styles.container}>
      <AppHeader title="Dispute Evidence" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* ORDER HEADER */}
        <View style={styles.card}>
          <Text style={styles.orderNumber}>
            Order #{publicOrderNumber}
          </Text>

          <Text style={styles.label}>
            Opened By:{" "}
            <Text style={styles.value}>
              {dispute.opened_by || "N/A"}
            </Text>
          </Text>

          <Text style={styles.label}>
            Reason:{" "}
            <Text style={styles.value}>
              {dispute.reason || "N/A"}
            </Text>
          </Text>

          <Text style={styles.label}>Description:</Text>
          <Text style={styles.description}>
            {dispute.description || "No description provided."}
          </Text>
        </View>

        {/* BUYER SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Buyer Response
          </Text>

          <Text style={styles.responseText}>
            {dispute.buyer_response || "No response from buyer."}
          </Text>

          <Text style={styles.subTitle}>
            Buyer Evidence
          </Text>
          {renderImages(dispute.buyer_evidence_urls)}
        </View>

        {/* SELLER SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Seller Response
          </Text>

          <Text style={styles.responseText}>
            {dispute.seller_response || "No response from seller."}
          </Text>

          <Text style={styles.subTitle}>
            Seller Evidence
          </Text>
          {renderImages(dispute.seller_evidence_urls)}
        </View>

        {/* ORIGINAL EVIDENCE (LEGACY FIELD) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Initial Evidence (At Dispute Creation)
          </Text>
          {renderImages(dispute.evidence_urls)}
        </View>
      </ScrollView>
    </View>
  )
}

const MELO_GREEN = "#7FAF9B"

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: "#F4F8F6",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E3EFE9",
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
    color: "#1A2B24",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
    color: "#1A2B24",
  },
  value: {
    fontWeight: "600",
    color: "#0F1E17",
  },
  description: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E3EFE9",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    color: "#1A2B24",
  },
  subTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
    color: "#1A2B24",
  },
  responseText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#E5E7EB",
  },
  noEvidence: {
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#D64545",
  },
})