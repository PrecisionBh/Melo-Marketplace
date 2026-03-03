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

import { supabase } from "@/lib/supabase"

type Props = {
  userId: string
  boostsRemaining: number
  lastBoostReset: string | null
  onPressBoost: () => void
  disabled?: boolean // 🔒 mirrors isPro=false behavior (like ProFeaturesCard)
}

export default function BoostsCard({
  userId,
  boostsRemaining,
  lastBoostReset,
  onPressBoost,
  disabled = false,
}: Props) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [activeBoosts, setActiveBoosts] = useState(0)
  const [activeMegaBoosts, setActiveMegaBoosts] = useState(0)

  useEffect(() => {
    const loadActiveBoosts = async () => {
      if (!userId) return

      try {
        setLoading(true)
        const now = new Date().toISOString()

        // Active Boosts
        const { count: boostCount } = await supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_boosted", true)
          .gt("boost_expires_at", now)

        setActiveBoosts(boostCount ?? 0)

        // Active Mega Boosts
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
    if (!lastBoostReset) return "Boosts reset monthly"

    try {
      const last = new Date(lastBoostReset)
      const next = new Date(last)
      next.setMonth(next.getMonth() + 1)

      const diffMs = next.getTime() - Date.now()
      const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

      return `${days} day${days === 1 ? "" : "s"} until boosts replenish`
    } catch {
      return "Boosts reset monthly"
    }
  }

  const onPressAddMore = () => {
    // If they're not Pro (card locked), send to Pro marketing page
    if (disabled) {
      router.push("/melo-pro")
      return
    }

    // Pro users -> Boost Store
    router.push("/pro/packages")
  }

  return (
    <View style={[styles.card, disabled && styles.locked]}>
      {/* Header (Mimics ProFeaturesCard style) */}
      <View style={styles.headerRow}>
        <Ionicons name="sparkles" size={18} color="#CFAF4A" />
        <Text style={styles.title}>Boost Power</Text>

        {disabled && (
          <View style={styles.proPill}>
            <Text style={styles.proPillText}>PRO</Text>
          </View>
        )}
      </View>

      {/* Subtext (like Create Listing) */}
      <Text style={styles.subtitle}>
        {disabled
          ? "Upgrade to Melo Pro to unlock Boost & Mega Boost visibility"
          : `${boostsRemaining} boosts available`}
      </Text>

      {/* Pills Row */}
      <View style={styles.pillsRow}>
        {/* Boost Pill */}
        <View style={styles.pillContainer}>
          <View style={styles.boostPill}>
            <Ionicons name="flash-outline" size={16} color="#0F1E17" />
            <Text style={styles.pillNumber}>{boostsRemaining}</Text>
            <Text style={styles.pillLabel}>Boosts</Text>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 6 }} size="small" />
          ) : (
            <Text style={styles.activeText}>{activeBoosts} active boosts</Text>
          )}
        </View>

        {/* Mega Boost Pill */}
        <View style={styles.pillContainer}>
          <View style={styles.megaPill}>
            <Ionicons name="star-outline" size={16} color="#CFAF4A" />
            <Text style={styles.megaPillNumber}>{activeMegaBoosts}</Text>
            <Text style={styles.megaPillLabel}>Mega</Text>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 6 }} size="small" />
          ) : (
            <Text style={styles.activeText}>
              {activeMegaBoosts} active mega boosts
            </Text>
          )}
        </View>
      </View>

      {/* Reset Timer */}
      <Text style={styles.resetText}>{getResetDaysText()}</Text>

      {/* Primary CTA */}
      <TouchableOpacity
        style={[styles.boostButton, disabled && styles.boostButtonDisabled]}
        activeOpacity={0.9}
        onPress={disabled ? undefined : onPressBoost}
        disabled={disabled}
      >
        <Ionicons name="flash" size={18} color="#CFAF4A" />
        <Text style={styles.boostButtonText}>Boost a Listing</Text>
      </TouchableOpacity>

      {/* Secondary CTA: Add More Boosts */}
      <TouchableOpacity
        style={[
          styles.addMoreButton,
          disabled && styles.addMoreButtonDisabled,
        ]}
        activeOpacity={0.9}
        onPress={onPressAddMore}
      >
        <Ionicons
          name={disabled ? "lock-closed" : "cart-outline"}
          size={18}
          color="#FFFFFF"
        />
        <Text style={styles.addMoreText}>
          {disabled ? "Unlock Boost Packs (Go Pro)" : "Add more boosts"}
        </Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  /* Container EXACTLY mimics ProFeaturesCard locking style */
  card: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(214,179,90,0.55)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  /* 🔒 THIS is the magic (same as create-listing) */
  locked: {
    opacity: 0.7,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },

  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
  },

  proPill: {
    marginLeft: "auto",
    backgroundColor: "#CFAF4A",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },

  proPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#0F1E17",
  },

  subtitle: {
    fontSize: 12,
    color: "#6B8F7D",
    marginBottom: 14,
    fontWeight: "600",
  },

  pillsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 4,
  },

  pillContainer: {
    flex: 1,
    alignItems: "center",
  },

  boostPill: {
    width: "100%",
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15,30,23,0.10)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  megaPill: {
    width: "100%",
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(214,179,90,0.45)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  pillNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F1E17",
  },

  pillLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F1E17",
    opacity: 0.7,
  },

  megaPillNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: "#CFAF4A",
  },

  megaPillLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: "#CFAF4A",
  },

  activeText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B8F7D",
    textAlign: "center",
  },

  resetText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B8F7D",
    textAlign: "center",
  },

  boostButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 18,
    backgroundColor: "#0B0F0D",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(214,179,90,0.65)",
  },

  boostButtonDisabled: {
    opacity: 0.35,
  },

  boostButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#CFAF4A",
  },

  /* NEW: Add More Boosts button */
  addMoreButton: {
    marginTop: 10,
    height: 46,
    borderRadius: 18,
    backgroundColor: "#0F1E17",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  addMoreButtonDisabled: {
    opacity: 0.95, // keep readable even when locked (card itself already dims)
    borderColor: "rgba(214,179,90,0.45)",
  },

  addMoreText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },
})