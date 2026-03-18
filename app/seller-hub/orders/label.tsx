import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { supabase } from "@/lib/supabase"

type LabelOrder = {
  id: string
  public_order_number?: string | null
  carrier?: string | null
  tracking_number?: string | null
  label_url?: string | null
  shipping_label_purchased?: boolean | null
  shipping_label_cost_cents?: number | null
}

export default function LabelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [order, setOrder] = useState<LabelOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [voiding, setVoiding] = useState(false)

  useEffect(() => {
    if (id) loadOrder()
  }, [id])

  const loadOrder = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          public_order_number,
          carrier,
          tracking_number,
          label_url,
          shipping_label_purchased,
          shipping_label_cost_cents
        `)
        .eq("id", id)
        .single()

      if (error) throw error

      setOrder(data)
    } catch (err) {
      Alert.alert("Error", "Failed to load label")
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!order?.label_url) {
      Alert.alert("Error", "Label not available")
      return
    }

    try {
      await Linking.openURL(order.label_url)
    } catch {
      Alert.alert("Unable to open label")
    }
  }

  const handleEmail = async () => {
    if (!order?.label_url) {
      Alert.alert("Error", "Label not available")
      return
    }

    const subject = `Shipping Label - Order ${order.public_order_number || order.id}`
    const body = `Download your shipping label:\n\n${order.label_url}`

    try {
      await Linking.openURL(
        `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      )
    } catch {
      Alert.alert("Unable to open email")
    }
  }

  const handleVoid = async () => {
    if (!order) return

    Alert.alert(
      "Void Label",
      "This will cancel the shipping label. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Void Label",
          style: "destructive",
          onPress: async () => {
            try {
              setVoiding(true)

              const { error } = await supabase.functions.invoke(
                "void-shippo-label",
                {
                  body: { orderId: order.id },
                }
              )

              if (error) throw error

              Alert.alert("Label Voided")
              await loadOrder()
            } catch (err) {
              Alert.alert("Error", "Failed to void label")
            } finally {
              setVoiding(false)
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 80 }} />
  }

  if (!order) {
    return null
  }

  const hasLabel = !!order.label_url
  const hasPurchasedLabel = !!order.shipping_label_purchased
  const hasLabelCost = order.shipping_label_cost_cents !== null && order.shipping_label_cost_cents !== undefined

  return (
    <View style={styles.screen}>
      <AppHeader title="Shipping Label" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.orderId}>
          Order {order.public_order_number || order.id}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Label Status</Text>
          <Text style={styles.value}>
            {hasPurchasedLabel ? "Purchased" : "Not Purchased"}
          </Text>

          <Text style={styles.label}>Carrier</Text>
          <Text style={styles.value}>{order.carrier || "—"}</Text>

          <Text style={styles.label}>Tracking Number</Text>
          <Text style={styles.value}>{order.tracking_number || "—"}</Text>

          {hasLabelCost ? (
            <>
              <Text style={styles.label}>Label Cost</Text>
              <Text style={styles.value}>
                ${(Number(order.shipping_label_cost_cents) / 100).toFixed(2)}
              </Text>
            </>
          ) : null}
        </View>

        {hasLabel ? (
          <TouchableOpacity style={styles.primary} onPress={handleDownload}>
            <Text style={styles.primaryText}>Download Label</Text>
          </TouchableOpacity>
        ) : null}

        {hasLabel ? (
          <TouchableOpacity style={styles.secondary} onPress={handleEmail}>
            <Text style={styles.secondaryText}>Email Label</Text>
          </TouchableOpacity>
        ) : null}

        {hasLabel ? (
          <TouchableOpacity
            style={styles.danger}
            onPress={handleVoid}
            disabled={voiding}
          >
            <Text style={styles.dangerText}>
              {voiding ? "Voiding..." : "Void Label"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },
  content: {
    padding: 16,
  },
  orderId: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    color: "#111",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  primary: {
    backgroundColor: "#7FAF9B",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  primaryText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
  secondary: {
    backgroundColor: "#E0E0E0",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  secondaryText: {
    textAlign: "center",
    fontWeight: "600",
    color: "#000",
  },
  danger: {
    backgroundColor: "#D9534F",
    padding: 14,
    borderRadius: 12,
  },
  dangerText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
})