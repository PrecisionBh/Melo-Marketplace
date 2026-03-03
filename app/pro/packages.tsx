import { Ionicons } from "@expo/vector-icons"
import * as Linking from "expo-linking"
import { useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { supabase } from "@/lib/supabase"

const { width } = Dimensions.get("window")

type Pack = {
  id: string
  title: string
  subtitle: string
  priceLabel: string
  credits: number
  badge?: string
  accent?: "boost" | "mega"
}

const BOOST_PACKS: Pack[] = [
  {
    id: "boost_3",
    title: "Starter Pack",
    subtitle: "3 Boosts • 7 days each",
    priceLabel: "$9.99",
    credits: 3,
    badge: "Great to start",
    accent: "boost",
  },
  {
    id: "boost_10",
    title: "Growth Pack",
    subtitle: "10 Boosts • 7 days each",
    priceLabel: "$27.99",
    credits: 10,
    badge: "Most Popular",
    accent: "boost",
  },
  {
    id: "boost_25",
    title: "Power Pack",
    subtitle: "25 Boosts • 7 days each",
    priceLabel: "$59.99",
    credits: 25,
    badge: "Best Value",
    accent: "boost",
  },
]

const MEGA_PACKS: Pack[] = [
  {
    id: "mega_1",
    title: "Mega Boost",
    subtitle: "1 Mega • 14 days",
    priceLabel: "$19.99",
    credits: 1,
    badge: "Top placement",
    accent: "mega",
  },
  {
    id: "mega_3",
    title: "Mega Pack",
    subtitle: "3 Megas • 14 days each",
    priceLabel: "$49.99",
    credits: 3,
    badge: "Most Popular",
    accent: "mega",
  },
  {
    id: "mega_8",
    title: "Mega Pro Pack",
    subtitle: "8 Megas • 14 days each",
    priceLabel: "$99.99",
    credits: 8,
    badge: "Best Value",
    accent: "mega",
  },
]

export default function PackagesScreen() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const [isPro, setIsPro] = useState(false)
  const [boostsRemaining, setBoostsRemaining] = useState<number>(0)
  const [megaRemaining, setMegaRemaining] = useState<number>(0)

  const [buyingId, setBuyingId] = useState<string | null>(null)

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
          setMegaRemaining(0)
          return
        }

        setUserId(user.id)

        const { data, error } = await supabase
          .from("profiles")
          .select("is_pro, boosts_remaining, mega_boosts_remaining")
          .eq("id", user.id)
          .single()

        if (error) throw error

        setIsPro(!!data?.is_pro)
        setBoostsRemaining(Number(data?.boosts_remaining ?? 0))
        setMegaRemaining(Number(data?.mega_boosts_remaining ?? 0))
      } catch {
        setIsPro(false)
        setBoostsRemaining(0)
        setMegaRemaining(0)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const proPillText = useMemo(() => {
    if (!userId) return "SIGN IN REQUIRED"
    if (loading) return "CHECKING STATUS..."
    if (isPro) return "MELO PRO ACTIVE"
    return "MELO PRO REQUIRED"
  }, [userId, loading, isPro])

  const onPressUpgrade = () => {
    if (!userId) {
      router.push("/login")
      return
    }
    router.push("/melo-pro")
  }

  const handleBuyPack = async (packId: string) => {
    if (!userId) {
      router.push("/login")
      return
    }

    if (!isPro) {
      Alert.alert(
        "Melo Pro Required",
        "Boost Packs are exclusive to Melo Pro sellers. Upgrade to unlock boosts, mega boosts, and lower fees."
      )
      router.push("/melo-pro")
      return
    }

    try {
      setBuyingId(packId)

      const { data, error } = await supabase.functions.invoke(
        "create-boost-checkout",
        {
          body: {
            userId,
            packageId: packId,
          },
        }
      )

    console.log("Invoke result:", { data, error })

      if (error) throw error

      if (data?.url) {
        await Linking.openURL(data.url)
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Purchase failed")
    } finally {
      setBuyingId(null)
    }
  }


  return (
  <View style={styles.screen}>
    <AppHeader title="Boost Store" backLabel="Back" backRoute="/seller-hub" />

    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO */}
      <View style={styles.hero}>
        <View style={styles.heroGlow} />

        <View style={styles.heroTopRow}>
          <View style={styles.brandPill}>
            <Ionicons name="sparkles" size={14} color="#0F1E17" />
            <Text style={styles.brandPillText}>BOOST STORE</Text>
          </View>

          <View
            style={[
              styles.statusPill,
              isPro ? styles.statusPillPro : styles.statusPillLocked,
            ]}
          >
            <Ionicons
              name={isPro ? "checkmark-circle" : "lock-closed"}
              size={14}
              color={isPro ? "#0F1E17" : "#FFFFFF"}
            />
            <Text
              style={[
                styles.statusPillText,
                isPro ? { color: "#0F1E17" } : { color: "#FFFFFF" },
              ]}
            >
              {proPillText}
            </Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>Get seen.</Text>
        <Text style={styles.heroTitle2}>Sell faster.</Text>

        <Text style={styles.heroSub}>
          Boosts aren’t cosmetic — they’re strategy. Featured placement gets
          more clicks, more offers, and faster sales.
        </Text>

        {/* FEATURE CARDS */}
        <View style={styles.featureRow}>
          <FeatureCard
            icon="rocket"
            title="Stay at the Top"
            desc="Boost keeps your listing featured for 7 days."
          />
          <FeatureCard
            icon="flame"
            title="Dominate with Mega"
            desc="Mega Boost takes over 3 full rows."
            accent="mega"
          />
          <FeatureCard
            icon="trending-up"
            title="Sell Faster"
            desc="More visibility = more offers."
          />
        </View>

        {!isPro && (
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={onPressUpgrade}
            activeOpacity={0.9}
            disabled={loading}
          >
            <View style={styles.upgradeInner}>
              <Ionicons name="sparkles" size={18} color="#0F1E17" />
              <Text style={styles.upgradeText}>
                Upgrade to Melo Pro to buy packs
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#0F1E17" />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* BOOST PACKS */}
      <SectionHeader
        title="Boost Packs"
        subtitle="Each Boost lasts 7 days"
        icon="rocket-outline"
      />

      <View style={styles.grid}>
        <View style={styles.row}>
          <PackCard
            pack={BOOST_PACKS[0]}
            locked={!isPro}
            loading={buyingId === BOOST_PACKS[0].id}
            onPress={() => handleBuyPack(BOOST_PACKS[0].id)}
          />
          <PackCard
            pack={BOOST_PACKS[1]}
            locked={!isPro}
            loading={buyingId === BOOST_PACKS[1].id}
            onPress={() => handleBuyPack(BOOST_PACKS[1].id)}
          />
        </View>

        <PackCard
          pack={BOOST_PACKS[2]}
          locked={!isPro}
          loading={buyingId === BOOST_PACKS[2].id}
          onPress={() => handleBuyPack(BOOST_PACKS[2].id)}
          fullWidth
        />
      </View>

      {/* MEGA PACKS */}
      <SectionHeader
        title="Mega Boost Packs"
        subtitle="Each Mega lasts 14 days"
        icon="flame-outline"
      />

      <View style={styles.grid}>
        <View style={styles.row}>
          <PackCard
            pack={MEGA_PACKS[0]}
            locked={!isPro}
            loading={buyingId === MEGA_PACKS[0].id}
            onPress={() => handleBuyPack(MEGA_PACKS[0].id)}
          />
          <PackCard
            pack={MEGA_PACKS[1]}
            locked={!isPro}
            loading={buyingId === MEGA_PACKS[1].id}
            onPress={() => handleBuyPack(MEGA_PACKS[1].id)}
          />
        </View>

        <PackCard
          pack={MEGA_PACKS[2]}
          locked={!isPro}
          loading={buyingId === MEGA_PACKS[2].id}
          onPress={() => handleBuyPack(MEGA_PACKS[2].id)}
          fullWidth
        />
      </View>

      <View style={{ height: 28 }} />
    </ScrollView>
  </View>
)
}

/* ---------------- SMALL COMPONENTS ---------------- */

function FeatureCard({
  icon,
  title,
  desc,
  accent,
}: {
  icon: any
  title: string
  desc: string
  accent?: "mega"
}) {
  return (
    <View
      style={[
        styles.featureCard,
        accent === "mega" && styles.featureCardMega,
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={accent === "mega" ? "#FFD700" : "#0F1E17"}
      />
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </View>
  )
}

function SectionHeader({
  title,
  subtitle,
  icon,
}: {
  title: string
  subtitle: string
  icon: any
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons name={icon} size={18} color="#0F1E17" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSub}>{subtitle}</Text>
      </View>
    </View>
  )
}
function PackCard({
  pack,
  locked,
  loading,
  onPress,
  fullWidth = false,
}: {
  pack: Pack
  locked: boolean
  loading: boolean
  onPress: () => void
  fullWidth?: boolean
}) {
  const accent =
    pack.accent === "mega"
      ? styles.megaAccentBorder
      : styles.boostAccentBorder

  return (
    <View
      style={[
        styles.packCard,
        accent,
        fullWidth && styles.packCardFull,
      ]}
    >
      <Text style={styles.packTitle}>{pack.title}</Text>
      <Text style={styles.packSubtitle}>{pack.subtitle}</Text>

      <View style={styles.packPriceRow}>
        <Text
          style={[
            styles.packPrice,
            fullWidth && styles.packPriceLarge,
          ]}
        >
          {pack.priceLabel}
        </Text>

        <View style={styles.creditsPill}>
          <Ionicons
            name={pack.accent === "mega" ? "flame" : "rocket"}
            size={14}
            color="#0F1E17"
          />
          <Text style={styles.creditsPillText}>{pack.credits}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.buyBtn,
          locked && { opacity: 0.55 },
          loading && { opacity: 0.85 },
        ]}
        onPress={onPress}
        disabled={locked || loading}
      >
        <View style={styles.buyInner}>
          <Ionicons name="card-outline" size={18} color="#0F1E17" />
          <Text style={styles.buyText}>Buy Pack</Text>
          <Ionicons name="arrow-forward" size={18} color="#0F1E17" />
        </View>
      </TouchableOpacity>
    </View>
  )
}

function Bullet({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name={icon} size={16} color="#7FAF9B" />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B1410",
  },
  content: {
    paddingBottom: 16,
  },

  row: {
  flexDirection: "row",
  justifyContent: "space-between",
  gap: 12,
},

packCard: {
  width: (width - 16 * 2 - 12) / 2, // 2 cards per row
  borderRadius: 18,
  padding: 12,
  backgroundColor: "rgba(255,255,255,0.06)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.10)",
},

packCardFull: {
  width: "100%",
  marginTop: 12,
  paddingVertical: 18,
  borderWidth: 2,
  borderColor: "rgba(255,215,0,0.45)",
},

packPriceLarge: {
  fontSize: 22,
},

  hero: {
    margin: 16,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#0F1E17",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroGlow: {
    position: "absolute",
    top: -70,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#7FAF9B",
    opacity: 0.35,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
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
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    gap: 7,
  },
  statusPillPro: {
    backgroundColor: "#BFE7D4",
    borderColor: "rgba(191,231,212,0.55)",
  },
  statusPillLocked: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.18)",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  heroTitle: {
    marginTop: 14,
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 36,
  },
  heroTitle2: {
    fontSize: 32,
    fontWeight: "900",
    color: "#BFE7D4",
    lineHeight: 36,
  },
  heroSub: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.86)",
    lineHeight: 20,
  },

  balanceRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: "#BFE7D4",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1E17",
  },
  balanceLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "900",
    color: "#0F1E17",
    opacity: 0.85,
    textAlign: "center",
  },

  upgradeBtn: {
    marginTop: 14,
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#7FAF9B",
  },
  upgradeInner: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeText: {
    marginHorizontal: 10,
    fontSize: 15,
    fontWeight: "900",
    color: "#0F1E17",
  },

  sectionHeader: {
    marginTop: 8,
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#BFE7D4",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  sectionSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.70)",
    lineHeight: 16,
  },

  grid: {
    marginTop: 10,
    marginHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },

  boostAccentBorder: {
    borderColor: "rgba(127,175,155,0.28)",
  },
  megaAccentBorder: {
    borderColor: "rgba(255,215,0,0.22)",
  },
  packTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  packBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  packBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  lockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  lockPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  packTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  packSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.72)",
    lineHeight: 16,
  },
  packPriceRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  packPrice: {
    fontSize: 18,
    fontWeight: "900",
    color: "#BFE7D4",
  },
  creditsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#BFE7D4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  creditsPillText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F1E17",
  },

  buyBtn: {
    marginTop: 12,
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#7FAF9B",
  },
  buyInner: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buyText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F1E17",
  },

  footerCard: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  footerDesc: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.80)",
    lineHeight: 18,
  },
  footerBullets: {
    marginTop: 12,
    gap: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.82)",
    lineHeight: 16,
  },

  featureRow: {
  marginTop: 16,
  flexDirection: "row",
  gap: 10,
},

featureCard: {
  flex: 1,
  backgroundColor: "#BFE7D4",
  borderRadius: 16,
  paddingVertical: 14,
  paddingHorizontal: 12,
  alignItems: "center",
  justifyContent: "center",
},

featureCardMega: {
  backgroundColor: "#BFE7D4",
  borderWidth: 1,
  borderColor: "rgba(255,215,0,0.55)",
},

featureTitle: {
  marginTop: 8,
  fontSize: 13,
  fontWeight: "900",
  color: "#0F1E17",
  textAlign: "center",
},

featureDesc: {
  marginTop: 6,
  fontSize: 11,
  fontWeight: "800",
  color: "rgba(15,30,23,0.75)",
  textAlign: "center",
  lineHeight: 14,
},
})