import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

type Dispute = {
  id: string
  order_id: string
  buyer_id: string
  seller_id: string
  status: string | null
  opened_by: "buyer" | "seller" | null
  buyer_responded_at: string | null
  seller_responded_at: string | null
  resolution: string | null
  resolved_at: string | null
  reason: string | null
  description: string | null
  created_at: string
  orders?: {
    public_order_number: string | null
  } | null
}

export default function ProblemOrdersScreen() {
  const router = useRouter()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const [refundingId, setRefundingId] = useState<string | null>(null)

  useEffect(() => {
    fetchDisputes()
  }, [showResolved])

  const fetchDisputes = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from("disputes")
        .select(`
          *,
          orders:order_id (
            public_order_number
          )
        `)
        .order("created_at", { ascending: false })

      if (showResolved) {
        query = query.not("resolved_at", "is", null)
      } else {
        query = query.is("resolved_at", null)
      }

      const { data, error } = await query
      if (error) throw error

      setDisputes(data || [])
    } catch (err) {
      handleAppError(err, {
        context: "admin_fetch_disputes",
        fallbackMessage: "Failed to load dispute queue.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async (disputeId: string) => {
  try {
    Alert.alert(
      "Confirm Refund",
      "Are you sure you want to refund the buyer? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Refund",
          style: "destructive",
          onPress: async () => {
            try {
              setRefundingId(disputeId)

              // 🔥 Get session (needed for Authorization header)
              const { data: sessionData, error: sessionErr } =
                await supabase.auth.getSession()

              if (sessionErr) {
                console.error("SESSION ERROR:", sessionErr)
                throw sessionErr
              }

              const token = sessionData?.session?.access_token
              const userId = sessionData?.session?.user?.id

              console.log("🧠 ADMIN REFUND DEBUG:", {
                disputeId,
                hasToken: !!token,
                userId,
              })

              if (!token) {
                throw new Error("Missing auth session token")
              }

              // 🔥 DIRECT FETCH (bypasses invoke() 400 parsing bug in React Native)
              const response = await fetch(
                "https://ccrrxdpfepsoghtgtpwx.supabase.co/functions/v1/admin-refund",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    apikey:
                      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
                  },
                  body: JSON.stringify({
                    dispute_id: disputeId,
                    admin_notes: "Refund issued by admin panel",
                  }),
                }
              )

              // 🔥 Read raw text FIRST (critical for debugging 400 errors)
              const rawText = await response.text()
              console.log("💸 RAW FUNCTION RESPONSE TEXT:", rawText)

              let parsed: any = null
              try {
                parsed = rawText ? JSON.parse(rawText) : null
              } catch (parseErr) {
                console.error("❌ JSON PARSE ERROR:", parseErr)
              }

              console.log("💸 PARSED FUNCTION RESPONSE:", {
                status: response.status,
                ok: response.ok,
                body: parsed,
              })

              // 🔥 Handle non-2xx properly (this is what invoke() was hiding)
              if (!response.ok) {
                const errorMessage =
                  parsed?.error ||
                  `Refund failed (${response.status})`
                console.error("❌ FUNCTION NON-200:", errorMessage)
                throw new Error(errorMessage)
              }

              if (!parsed?.success) {
                console.error("❌ FUNCTION RETURNED FAILURE:", parsed)
                throw new Error(parsed?.error || "Refund failed")
              }

              Alert.alert(
                "Refund Successful",
                "Buyer has been refunded and dispute resolved."
              )

              await fetchDisputes()
            } catch (err) {
              console.error("🔥 ADMIN REFUND CATCH:", err)
              handleAppError(err, {
                context: "admin_refund",
                fallbackMessage:
                  "Refund failed. Check console logs for exact reason.",
              })
            } finally {
              setRefundingId(null)
            }
          },
        },
      ]
    )
  } catch (err) {
    handleAppError(err, {
      context: "admin_refund_alert",
    })
  }
}

  const getResponseBadge = (d: Dispute) => {
    if (d.opened_by === "buyer" && !d.seller_responded_at) {
      return { text: "Seller needs to respond", color: "#D64545" }
    }

    if (d.opened_by === "seller" && !d.buyer_responded_at) {
      return { text: "Buyer needs to respond", color: "#D64545" }
    }

    if (d.buyer_responded_at && !d.seller_responded_at) {
      return { text: "Seller needs to respond", color: "#D64545" }
    }

    if (!d.buyer_responded_at && d.seller_responded_at) {
      return { text: "Buyer needs to respond", color: "#D64545" }
    }

    if (
      (d.opened_by === "buyer" && d.seller_responded_at) ||
      (d.opened_by === "seller" && d.buyer_responded_at)
    ) {
      return { text: "Under Review", color: "#F59E0B" }
    }

    return { text: "Pending", color: "#6B7280" }
  }

  const adminActionLocked = (d: Dispute) => {
    if (d.opened_by === "buyer") {
      return !d.seller_responded_at
    }

    if (d.opened_by === "seller") {
      return !d.buyer_responded_at
    }

    return true
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>
          Loading dispute queue...
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Problem Orders" />

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            !showResolved && styles.activeToggle,
          ]}
          onPress={() => setShowResolved(false)}
        >
          <Text style={styles.toggleText}>Unresolved</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleBtn,
            showResolved && styles.activeToggle,
          ]}
          onPress={() => setShowResolved(true)}
        >
          <Text style={styles.toggleText}>Resolved</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {disputes.map((d) => {
          const badge = getResponseBadge(d)
          const locked = adminActionLocked(d)
          const isRefunding = refundingId === d.id

          const publicOrderNumber =
            d.orders?.public_order_number || d.order_id

          return (
            <View key={d.id} style={styles.card}>
              <Text style={styles.orderId}>
                Order: #{publicOrderNumber}
              </Text>

              <Text style={styles.reason}>
                Reason: {d.reason || "N/A"}
              </Text>

              <Text style={styles.description}>
                {d.description || "No description provided"}
              </Text>

              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: badge.color },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {badge.text}
                  </Text>
                </View>

                {d.resolved_at && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: "#16A34A" },
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      Resolved
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.evidenceBtn}
                  onPress={() =>
                    router.push(`/admin-panel/evidence?id=${d.id}`)
                  }
                >
                  <Text style={styles.buttonText}>
                    View Evidence
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.refundBtn,
                    (locked || isRefunding) && styles.disabledBtn,
                  ]}
                  disabled={locked || isRefunding}
                  onPress={() => handleRefund(d.id)}
                >
                  {isRefunding ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      Refund Buyer
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.releaseBtn,
                    locked && styles.disabledBtn,
                  ]}
                  disabled={locked}
                >
                  <Text style={styles.buttonText}>
                    Release Escrow
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const MELO_GREEN = "#7FAF9B"

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 16, paddingBottom: 60 },
  card: {
    backgroundColor: "#F4F8F6",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E3EFE9",
  },
  orderId: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  reason: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  description: { fontSize: 13, color: "#555", marginBottom: 10 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { color: "#FFF", fontWeight: "700", fontSize: 12 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  evidenceBtn: {
    flex: 1,
    backgroundColor: "#1F7A63",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  refundBtn: {
    flex: 1,
    backgroundColor: "#D64545",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  releaseBtn: {
    flex: 1,
    backgroundColor: "#2E7D32",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledBtn: {
    backgroundColor: "#BDBDBD",
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleRow: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },
  activeToggle: {
    backgroundColor: MELO_GREEN,
  },
  toggleText: {
    fontWeight: "800",
    color: "#1A2B24",
  },
})