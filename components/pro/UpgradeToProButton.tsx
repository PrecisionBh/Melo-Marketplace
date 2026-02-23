import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

type Props = {
  variant?: "full" | "compact"
  style?: any
}

export default function UpgradeToProButton({ variant = "full", style }: Props) {
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

  // If already Pro, hide button completely (clean UX)
  if (loading) {
    return (
      <View style={[styles.loadingWrap, style]}>
        <ActivityIndicator />
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

  if (variant === "compact") {
    return (
      <TouchableOpacity style={[styles.compactBtn, style]} onPress={onPress} activeOpacity={0.85}>
        <Ionicons name="sparkles" size={14} color="#0F1E17" />
        <Text style={styles.compactText}>Go Pro</Text>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity style={[styles.fullWrap, style]} onPress={onPress} activeOpacity={0.9}>
      <LinearGradient
        colors={["#7FAF9B", "#BFE7D4", "#7FAF9B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Ionicons name="rocket-outline" size={18} color="#0F1E17" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Upgrade to Melo Pro</Text>
          <Text style={styles.subtitle}>
            Unlimited listings • 10 boosts/month • Quantity selling
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color="#0F1E17" />
      </LinearGradient>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fullWrap: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F1E17",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F1E17",
    opacity: 0.75,
    marginTop: 2,
  },
  compactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#BFE7D4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  compactText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F1E17",
  },
})