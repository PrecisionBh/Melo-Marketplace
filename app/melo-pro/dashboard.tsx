import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import BoostsCard from "@/components/prodashboard/BoostsCard"
import ProHeroBanner from "@/components/prodashboard/ProHeroBanner"
import ProQuickActions from "@/components/prodashboard/ProQuickActions"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

type Profile = {
  is_pro: boolean
  boosts_remaining: number | null
  last_boost_reset: string | null
}

export default function MeloProDashboardScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log("👑 [MELO PRO DASHBOARD] Loading profile...")

      const { data, error } = await supabase
        .from("profiles")
        .select("is_pro, boosts_remaining, last_boost_reset")
        .eq("id", userId)
        .single()

      if (error) {
        console.error("❌ [MELO PRO DASHBOARD] Profile load error:", error)
        setProfile(null)
        return
      }

      console.log("✅ [MELO PRO DASHBOARD] Profile loaded:", data)
      setProfile(data)
    } catch (err) {
      console.error("🚨 [MELO PRO DASHBOARD] Crash:", err)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useFocusEffect(
    useCallback(() => {
      loadProfile()
    }, [loadProfile])
  )

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Melo Pro"
        backLabel="Back"
        backRoute="/seller-hub"
      />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color="#7FAF9B"
        />
      ) : profile?.is_pro ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* 👑 Premium Hero Banner */}
          <ProHeroBanner
            boostsRemaining={profile.boosts_remaining ?? 0}
          />

          {/* 🚀 Boost Power Card */}
          <BoostsCard
            userId={userId!}
            boostsRemaining={profile.boosts_remaining ?? 0}
            lastBoostReset={profile.last_boost_reset}
            onPressBoost={() => {
              console.log("🚀 [MELO PRO] Boost a listing pressed")
              router.push("/seller-hub/my-listings")
            }}
          />

          {/* 🤍 Scalable Tools Section */}
          <ProQuickActions />

          {/* Extra bottom padding so last card never hugs screen edge */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },
  scrollContent: {
    paddingBottom: 40, // 🔥 prevents cutoff on smaller phones
  },
  loader: {
    marginTop: 40,
  },
  bottomSpacer: {
    height: 20,
  },
})