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
  style?: any
  variant?: "full" | "compact"
}

export default function IsProButton({ style, variant = "full" }: Props) {
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

        const { data, error } = await supabase
          .from("profiles")
          .select("is_pro")
          .eq("id", userId)
          .single()

        if (error) throw error

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
        <ActivityIndicator />
      </View>
    )
  }

  // Hide completely if NOT Pro (important for clean UX)
  if (!isPro) return null

  const onPress = () => {
  router.push("/melo-pro/dashboard")
}

  if (variant === "compact") {
    return (
      <TouchableOpacity
        style={[styles.compactBtn, style]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Ionicons name="trophy" size={14} color="#FFD700" />
        <Text style={styles.compactText}>Pro Dashboard</Text>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      style={[styles.proCard, style]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Subtle Gold Aura */}
      <View style={styles.glow} />

      <View style={styles.row}>
        {/* Icon (filled for owned status) */}
        <View style={styles.iconWrap}>
          <Ionicons name="trophy" size={20} color="#FFD700" />
        </View>

        {/* Text */}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Melo Pro Dashboard</Text>
          <Text style={styles.subtitle}>
            Manage boosts • Listings • Pro benefits
          </Text>
        </View>

        {/* Status Pill */}
        <View style={styles.activePill}>
          <Text style={styles.activePillText}>ACTIVE</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  /* SAME LUXURY CARD SYSTEM AS UPGRADE BUTTON */
  proCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#0B1511",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.28)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  glow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#FFD700",
    opacity: 0.08,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,215,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },

  activePill: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  activePillText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0B1511",
    letterSpacing: 1,
  },

  /* COMPACT (HEADER / SMALL AREAS) */
  compactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0B1511",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  compactText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFD700",
    letterSpacing: 0.5,
  },
})