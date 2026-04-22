import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

type Props = {
  variant?: "full" | "compact"
  style?: any
}

export default function UpgradeToProCard({
  variant = "full",
  style,
}: Props) {
  const router = useRouter()
  const { session } = useAuth()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    const checkPro = async () => {
      try {
        if (!userId) {
          setIsPro(false)
          return
        }

        const { data } = await supabase
          .from("profiles")
          .select("is_pro")
          .eq("id", userId)
          .single()

        setIsPro(!!data?.is_pro)
      } catch {
        setIsPro(false)
      } finally {
        setLoading(false)
      }
    }

    checkPro()
  }, [userId])

  if (loading) {
    return (
      <View style={[styles.loadingWrap, style]}>
        <ActivityIndicator color="#D97732" />
      </View>
    )
  }

  if (isPro) return null

  const onPress = () => {
    if (!userId) {
      router.push("/login")
      return
    }

    router.push("/melo-pro")
  }

  /* 🔹 COMPACT VERSION */
  if (variant === "compact") {
    return (
      <TouchableOpacity
        style={[styles.compactBtn, style]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Ionicons name="flash-outline" size={14} color="#D97732" />
        <Text style={styles.compactText}>Upgrade • 1% Fees</Text>
      </TouchableOpacity>
    )
  }

  /* 🔥 FULL CARD */
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons
            name="flash-outline"
            size={18}
            color="#D97732"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Upgrade to Melo Pro</Text>

          <Text style={styles.subtitle}>
            Pay 1% instead of 5%. Keep more from every sale.
          </Text>
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaText}>Upgrade</Text>
        </View>
      </View>

      {/* 🔥 VALUE STRIP */}
      <View style={styles.valueRow}>
        <Text style={styles.valueText}>1% Fees</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.valueText}>Unlimited Listings</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.valueText}>Boost Credits</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  /* 🔥 MATCH HEADER STYLE */
  card: {
  backgroundColor: "#F6EFE8",
  borderRadius: 16,
  padding: 14,
  borderWidth: 1,
  borderColor: "rgba(217,119,50,0.25)",
  marginBottom: 10, // 👈 add this
},

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(217,119,50,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  cta: {
    backgroundColor: "#D97732",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },

  ctaText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },

  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  valueText: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "600",
  },

  dot: {
    marginHorizontal: 6,
    color: "#9CA3AF",
  },

  /* 🔹 COMPACT */
  compactBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6EFE8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(217,119,50,0.25)",
  },

  compactText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D97732",
    marginLeft: 4,
  },
})