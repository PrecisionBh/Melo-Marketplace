import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import { useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import * as Clipboard from "expo-clipboard"
import QRCode from "react-native-qrcode-svg"

import { supabase } from "@/lib/supabase"

export default function ShippingLabelScreen() {
  const params = useLocalSearchParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)

  useEffect(() => {
    if (id) loadOrder()
  }, [id])

  const loadOrder = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error

      setOrder(data)
    } catch (err) {
      console.log("❌ Failed to load label:", err)
    } finally {
      setLoading(false)
    }
  }

  const openLabel = () => {
    if (!order?.label_url) return
    Linking.openURL(order.label_url)
  }

  const emailLabel = () => {
    if (!order?.label_url) return
    Linking.openURL(
      `mailto:?subject=Shipping Label&body=${order.label_url}`
    )
  }

  const copyLabel = async () => {
    if (!order?.label_url) return
    await Clipboard.setStringAsync(order.label_url)
  }

  /* ---------------- STATES ---------------- */

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#D97732" />
      </View>
    )
  }

  if (!order?.label_url) {
    return (
      <View style={styles.loader}>
        <Text style={{ fontWeight: "700" }}>
          No label available
        </Text>
      </View>
    )
  }

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          Shipping Label
        </Text>

        {/* 🔥 QR CARD */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            Scan at UPS / USPS
          </Text>

          <View style={styles.qrWrap}>
            <QRCode
              value={order.label_url}
              size={200}
            />
          </View>

          <Text style={styles.sub}>
            Show this QR code at the counter or open the label below.
          </Text>
        </View>

        {/* 🔥 ACTION CARD */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={openLabel}
          >
            <Text style={styles.primaryText}>
              View / Print Label
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={emailLabel}
          >
            <Text style={styles.secondaryText}>
              Email Label
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={copyLabel}
          >
            <Text style={styles.ghostText}>
              Copy Link
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <GlobalFooter />
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F1E17",
    marginBottom: 18,
  },

  /* 🔥 BASE44 CARD STYLE */
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },

  cardLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },

  qrWrap: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F9FAFB",
    marginBottom: 12,
  },

  sub: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 10,
  },

  /* 🔥 BUTTON SYSTEM */

  primaryBtn: {
    backgroundColor: "#D97732",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },

  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  secondaryBtn: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#D97732",
    marginBottom: 10,
  },

  secondaryText: {
    color: "#D97732",
    fontWeight: "800",
    fontSize: 14,
  },

  ghostBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },

  ghostText: {
    color: "#6B7280",
    fontWeight: "700",
    fontSize: 13,
  },
})