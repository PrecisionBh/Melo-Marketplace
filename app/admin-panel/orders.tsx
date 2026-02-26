import { useState } from "react"
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

type OrderRow = {
  id: string
  public_order_number?: string | null
  buyer_id?: string | null
  seller_id?: string | null
  status?: string | null
  amount_total?: number | null
  escrow_status?: string | null
  is_disputed?: boolean | null
  return_status?: string | null
  created_at?: string | null
  [key: string]: any // Allows FULL row rendering safely
}

export default function AdminOrderSearchScreen() {
  const [orderId, setOrderId] = useState("")
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<OrderRow | null>(null)

  // 🔥 FIXED: Proper variable name for public order search
  const normalizedOrderNumber = orderId.trim()

  const handleSearchOrder = async () => {
    if (!normalizedOrderNumber) {
      Alert.alert(
        "Order Number Required",
        "Please enter a valid Order Number."
      )
      return
    }

    try {
      setLoading(true)
      setOrder(null)

      const { data, error } = await supabase
        .from("orders")
        .select("*") // FULL ROW (admin requirement)
        .eq("public_order_number", normalizedOrderNumber)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        Alert.alert(
          "Not Found",
          "No order found with that Order Number."
        )
        return
      }

      setOrder(data)
    } catch (err) {
      handleAppError(err, {
        context: "admin_search_order",
        fallbackMessage: "Failed to fetch order.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReleaseEscrow = () => {
    if (!order) return

    Alert.alert(
      "Release Escrow",
      "This will release escrow funds to the seller. (Wiring next)",
      [{ text: "OK" }]
    )
  }

  const handleRefund = () => {
    if (!order) return

    Alert.alert(
      "Initiate Refund",
      "This will trigger a Stripe refund. (Wiring next)",
      [{ text: "OK" }]
    )
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Search Orders (Admin)" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>
          Search Order by Order Number
        </Text>

        <TextInput
          placeholder="Enter Order Number (e.g. 1024 or MELO-1024)..."
          placeholderTextColor="#8FA39B"
          value={orderId}
          onChangeText={setOrderId}
          style={styles.input}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearchOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.searchButtonText}>
              Search Order
            </Text>
          )}
        </TouchableOpacity>

        {order && (
          <View style={styles.orderCard}>
            <Text style={styles.title}>Order Found</Text>

            {/* STATUS BADGES */}
            <View style={styles.badgeRow}>
              <StatusBadge
                label={`Status: ${order.status ?? "N/A"}`}
              />
              {order.is_disputed && (
                <StatusBadge label="DISPUTED" danger />
              )}
              {order.return_status && (
                <StatusBadge
                  label={`Return: ${order.return_status}`}
                />
              )}
            </View>

            {/* FULL ORDER ROW DISPLAY */}
            <Text style={styles.sectionTitle}>
              Full Order Data
            </Text>

            {Object.entries(order).map(([key, value]) => (
              <View key={key} style={styles.row}>
                <Text style={styles.key}>{key}</Text>
                <Text style={styles.value}>
                  {value === null || value === undefined
                    ? "null"
                    : typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)}
                </Text>
              </View>
            ))}

            {/* ADMIN ACTIONS */}
            <Text style={styles.sectionTitle}>
              Admin Actions
            </Text>

            <TouchableOpacity
              style={styles.releaseButton}
              onPress={handleReleaseEscrow}
            >
              <Text style={styles.buttonText}>
                💰 Release Escrow (Admin)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refundButton}
              onPress={handleRefund}
            >
              <Text style={styles.buttonText}>
                🔁 Initiate Refund (Admin)
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function StatusBadge({
  label,
  danger = false,
}: {
  label: string
  danger?: boolean
}) {
  return (
    <View
      style={[
        styles.badge,
        danger && { backgroundColor: "#D64545" },
      ]}
    >
      <Text style={styles.badgeText}>{label}</Text>
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
    padding: 20,
    paddingBottom: 60,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
    color: "#1A2B24",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D6E3DD",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    color: "#0F1E17",
  },
  searchButton: {
    backgroundColor: MELO_GREEN,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  orderCard: {
    backgroundColor: "#F4F8F6",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E3EFE9",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
    color: "#1A2B24",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: "#1F9D6A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 8,
    color: "#1A2B24",
  },
  row: {
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E6EFEA",
    paddingBottom: 6,
  },
  key: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B8F7D",
  },
  value: {
    fontSize: 14,
    color: "#0F1E17",
  },
  releaseButton: {
    marginTop: 14,
    backgroundColor: "#2E7D32",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  refundButton: {
    marginTop: 10,
    backgroundColor: "#D64545",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
})