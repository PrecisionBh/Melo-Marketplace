import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { supabase } from "@/lib/supabase"

type Props = {
  userId: string
  boostsRemaining: number
  lastBoostReset: string | null
  onPressBoost: () => void
}

export default function BoostsCard({
  userId,
  boostsRemaining,
  lastBoostReset,
  onPressBoost,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [activeBoosts, setActiveBoosts] = useState(0)
  const [activeMegaBoosts, setActiveMegaBoosts] = useState(0)

  useEffect(() => {
    const loadActiveBoosts = async () => {
      if (!userId) return

      try {
        setLoading(true)
        console.log("🚀 [BOOSTS CARD] Loading boosts + mega boosts...")

        const now = new Date().toISOString()

        // Normal Boosts
        const { count: boostCount } = await supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_boosted", true)
          .gt("boost_expires_at", now)

        setActiveBoosts(boostCount ?? 0)

        // Mega Boosts
        const { count: megaCount } = await supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_mega_boosted", true)
          .gt("mega_boost_expires_at", now)

        setActiveMegaBoosts(megaCount ?? 0)
      } catch (err) {
        console.error("🚨 [BOOSTS CARD] Crash:", err)
        setActiveBoosts(0)
        setActiveMegaBoosts(0)
      } finally {
        setLoading(false)
      }
    }

    loadActiveBoosts()
  }, [userId])

  const getResetDaysText = () => {
    if (!lastBoostReset) return "Monthly reset active"

    try {
      const last = new Date(lastBoostReset)
      const next = new Date(last)
      next.setMonth(next.getMonth() + 1)

      const diffMs = next.getTime() - Date.now()
      const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

      return `Boosts reset in ${days} day${days === 1 ? "" : "s"}`
    } catch {
      return "Monthly reset active"
    }
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="rocket-outline" size={18} color="#0F1E17" />
        </View>
        <Text style={styles.title}>Boost Power</Text>
      </View>

      {/* 👑 PILLS ROW (SIDE BY SIDE) */}
      <View style={styles.pillsRow}>
        {/* Normal Boost Pill */}
        <View style={styles.boostPill}>
          <Ionicons name="flash-outline" size={16} color="#0F1E17" />
          <Text style={styles.pillNumber}>{boostsRemaining}</Text>
          <Text style={styles.pillLabel}>Boosts</Text>
        </View>

        {/* Mega Boost Pill (GOLD + GLOW) */}
        <View style={styles.megaPill}>
          <Ionicons name="star" size={16} color="#E6C200" />
          <Text style={styles.megaPillNumber}>
            {activeMegaBoosts}
          </Text>
          <Text style={styles.megaPillLabel}>Mega</Text>
        </View>
      </View>

      {/* Sub Stats (Smaller + Clean) */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 10 }} size="small" />
      ) : (
        <View style={styles.subStatsWrap}>
          <Text style={styles.subText}>
            {activeBoosts} Active Boosted Listing
            {activeBoosts === 1 ? "" : "s"}
          </Text>

          <Text style={styles.subText}>
            {activeMegaBoosts} Active Mega Boost
            {activeMegaBoosts === 1 ? "" : "s"}
          </Text>
        </View>
      )}

      <Text style={styles.resetText}>{getResetDaysText()}</Text>

      {/* CTA */}
      <TouchableOpacity
        style={styles.boostButton}
        activeOpacity={0.9}
        onPress={onPressBoost}
      >
        <Ionicons name="flash-outline" size={18} color="#0F1E17" />
        <Text style={styles.boostButtonText}>Boost a Listing</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E6EFEA",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EAF4EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
  },

  /* 👑 PILLS */
  pillsRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 12,
  },

  boostPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EAF4EF",
  },

  megaPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFF9E6",
    borderWidth: 1.5,
    borderColor: "#E6C200",
    shadowColor: "#E6C200",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },

  pillNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F1E17",
  },

  pillLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F1E17",
    opacity: 0.7,
  },

  megaPillNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: "#B89600",
  },

  megaPillLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#B89600",
  },

  subStatsWrap: {
    marginTop: 10,
  },

  subText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2C3E35",
    opacity: 0.85,
    marginTop: 2,
  },

  resetText: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#0F1E17",
    opacity: 0.55,
  },

  boostButton: {
    marginTop: 14,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#7FAF9B",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  boostButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F1E17",
  },
})