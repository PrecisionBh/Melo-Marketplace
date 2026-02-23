import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native"

import AppHeader from "@/components/app-header"
import { supabase } from "@/lib/supabase"

const { width } = Dimensions.get("window")

export default function MeloProScreen() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const [isPro, setIsPro] = useState(false)
  const [boostsRemaining, setBoostsRemaining] = useState<number>(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user?.id) {
          setUserId(null)
          setIsPro(false)
          setBoostsRemaining(0)
          return
        }

        setUserId(user.id)

        const { data, error } = await supabase
          .from("profiles")
          .select("is_pro, boosts_remaining")
          .eq("id", user.id)
          .single()

        if (error) throw error

        setIsPro(!!data?.is_pro)
        setBoostsRemaining(Number(data?.boosts_remaining ?? 0))
      } catch (e) {
        // marketing page should still render even if profile fetch fails
        setIsPro(false)
        setBoostsRemaining(0)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const ctaLabel = useMemo(() => {
    if (!userId) return "Sign in to upgrade"
    if (loading) return "Loading..."
    if (isPro) return "You’re Melo Pro"
    return "Become Melo Pro — $10/mo"
  }, [userId, loading, isPro])

  const onPressCTA = () => {
    if (!userId) {
      router.push("/login")
      return
    }

    if (isPro) {
      Alert.alert("Melo Pro", "You’re already Melo Pro ✅")
      return
    }

    // ✅ Placeholder route (wire Stripe later)
    router.push("/melo-pro/checkout")
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Melo Pro" backLabel="Back" backRoute="/seller-hub" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO (keep big green card) */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />

          <View style={styles.heroTopRow}>
            <View style={styles.brandPill}>
              <Ionicons name="sparkles" size={14} color="#0F1E17" />
              <Text style={styles.brandPillText}>MELO PRO</Text>
            </View>

            <View style={styles.pricePill}>
              <Text style={styles.pricePillText}>$10 / month</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Sell smarter.</Text>
          <Text style={styles.heroTitle2}>Get seen faster.</Text>

          <Text style={styles.heroSub}>
            Melo Pro gives you the edge. More visibility, advanced seller tools, and a premium profile that helps you get seen, earn trust, and sell faster.
          </Text>

          <View style={styles.heroStatsRow}>
            <StatCard
              icon="rocket-outline"
              label="Boosted! Your Listings stay on top" 
              value="Pro Only"
            />
            <StatCard
              icon="layers-outline"
              label="Unlimited listings"
              value="Pro only"
            />
            <StatCard icon="cube-outline" label="Add Quantity to Listings" value="Pro only" />
          </View>
        </View>

        {/* CTA + disclaimer moved ABOVE "What you get" */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={[styles.ctaButton, loading && { opacity: 0.85 }]}
            onPress={onPressCTA}
            activeOpacity={0.9}
            disabled={loading}
          >
            <View style={styles.ctaInner}>
              <Ionicons name="sparkles" size={18} color="#0F1E17" />
              <Text style={styles.ctaText}>{ctaLabel}</Text>
              <Ionicons name="arrow-forward" size={18} color="#0F1E17" />
            </View>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>Cancel anytime. With Just the Click of a button</Text>
        </View>

        {/* WHAT YOU GET */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What you get</Text>

          <PerkRow
            icon="ribbon-outline"
            title="Melo Pro badge"
            desc="Look premium on your public profile and listings."
          />
          <PerkRow
            icon="infinite-outline"
            title="Unlimited active listings"
            desc="Free users are capped at 5 active listings. Pro removes the cap."
          />
          <PerkRow
            icon="cube-outline"
            title="Quantity listings"
            desc="List items with quantity for real inventory selling."
          />
          <PerkRow
            icon="rocket-outline"
            title="10 boosts per month"
            desc="Each boost lasts 7 days. Reboost to stay featured."
          />
          <PerkRow
            icon="wallet-outline"
            title="Payout history access"
            desc="Pro-only seller analytics and payout visibility."
          />
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  )
}

/* ---------------- SMALL COMPONENTS ---------------- */

function StatCard({
  icon,
  label,
  value,
}: {
  icon: any
  label: string
  value: string
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color="#0F1E17" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function PerkRow({
  icon,
  title,
  desc,
}: {
  icon: any
  title: string
  desc: string
}) {
  return (
    <View style={styles.perkRow}>
      <View style={styles.perkIcon}>
        <Ionicons name={icon} size={18} color="#0F1E17" />
      </View>
      <View style={styles.perkBody}>
        <Text style={styles.perkTitle}>{title}</Text>
        <Text style={styles.perkDesc}>{desc}</Text>
      </View>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },
  content: {
    paddingBottom: 16,
  },

  hero: {
    margin: 16,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#0F1E17",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  heroGlow: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#7FAF9B",
    opacity: 0.35,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#BFE7D4",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  brandPillText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: "900",
    color: "#0F1E17",
    letterSpacing: 1.2,
  },
  pricePill: {
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  pricePillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  heroTitle: {
    marginTop: 14,
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 34,
  },
  heroTitle2: {
    fontSize: 30,
    fontWeight: "900",
    color: "#BFE7D4",
    lineHeight: 34,
  },
  heroSub: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
  },

  heroStatsRow: {
    marginTop: 14,
    flexDirection: "row",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#BFE7D4",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  statValue: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "900",
    color: "#0F1E17",
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "800",
    color: "#0F1E17",
    opacity: 0.85,
    textAlign: "center",
  },

  ctaWrap: {
    marginTop: 2,
    marginHorizontal: 16,
    alignItems: "center",
  },
  ctaButton: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    backgroundColor: "#7FAF9B",
  },
  ctaInner: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    marginHorizontal: 10,
    fontSize: 15,
    fontWeight: "900",
    color: "#0F1E17",
  },
  disclaimer: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "#0F1E17",
    opacity: 0.65,
    textAlign: "center",
    lineHeight: 16,
  },

  section: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E6EFEA",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
    marginBottom: 10,
  },

  perkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  perkIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EAF4EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  perkBody: {
    flex: 1,
  },
  perkTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F1E17",
  },
  perkDesc: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "600",
    color: "#2C3E35",
    opacity: 0.9,
    lineHeight: 18,
  },

  statusCard: {
    backgroundColor: "#EAF4EF",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DCEAE3",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  statusText: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: "800",
    color: "#0F1E17",
  },
  statusBold: {
    fontWeight: "900",
  },
  statusHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#0F1E17",
    opacity: 0.75,
    lineHeight: 16,
  },
})