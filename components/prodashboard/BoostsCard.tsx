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

  useEffect(() => {
    const loadActiveBoosts = async () => {
      if (!userId) return

      try {
        setLoading(true)
        console.log("🚀 [BOOSTS CARD] Loading active boosted listings...")

        const now = new Date().toISOString()

        const { count, error } = await supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_boosted", true)
          .gt("boost_expires_at", now)

        if (error) {
          console.error("❌ [BOOSTS CARD] Active boosts error:", error)
          setActiveBoosts(0)
          return
        }

        setActiveBoosts(count ?? 0)
        console.log("✅ [BOOSTS CARD] Active boosts:", count)
      } catch (err) {
        console.error("🚨 [BOOSTS CARD] Crash:", err)
        setActiveBoosts(0)
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
      {/* Top Row */}
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="rocket-outline" size={18} color="#0F1E17" />
        </View>
        <Text style={styles.title}>Monthly Boosts</Text>
      </View>

      {/* Main Stat */}
      <Text style={styles.boostCount}>
        {boostsRemaining} Boost{boostsRemaining === 1 ? "" : "s"} Remaining
      </Text>

      {/* Sub Stats */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 6 }} size="small" />
      ) : (
        <Text style={styles.subText}>
          {activeBoosts} Active Boosted Listing
          {activeBoosts === 1 ? "" : "s"}
        </Text>
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
  boostCount: {
    marginTop: 12,
    fontSize: 26,
    fontWeight: "900",
    color: "#0F1E17",
  },
  subText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#2C3E35",
    opacity: 0.85,
  },
  resetText: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: "#0F1E17",
    opacity: 0.6,
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