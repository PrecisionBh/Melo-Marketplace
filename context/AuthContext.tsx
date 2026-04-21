import { Session } from "@supabase/supabase-js"
import Constants from "expo-constants"
import * as Notifications from "expo-notifications"
import React, { createContext, useContext, useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { supabase } from "../lib/supabase"

// ✅ RevenueCat
import { initRevenueCat } from "@/lib/revenuecat"

type AuthContextType = {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
})

// 🔥 prevent duplicate push registration
let pushRegistered = false

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  /* ---------------- PUSH REGISTRATION ---------------- */

  const registerPushToken = async (userId: string) => {
    if (pushRegistered) return

    try {
      console.log("[PUSH] Registering push token...")

      const { status } = await Notifications.requestPermissionsAsync()
      if (status !== "granted") {
        console.log("[PUSH] Permission not granted")
        return
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId

      if (!projectId) {
        console.log("[PUSH] Missing projectId")
        return
      }

      const token = (
        await Notifications.getExpoPushTokenAsync({ projectId })
      ).data

      console.log("[PUSH] TOKEN:", token)

      await supabase
        .from("profiles")
        .update({ expo_push_token: token })
        .eq("id", userId)

      pushRegistered = true
    } catch (err: any) {
      console.log("[PUSH] Registration error:", err?.message ?? err)
    }
  }

  /* ---------------- BAN CHECK ---------------- */

  const checkBanStatus = async (userId: string): Promise<boolean> => {
    try {
      console.log("[AUTH] Checking ban status for:", userId)

      const { data, error } = await supabase
        .from("profiles")
        .select("is_banned")
        .eq("id", userId)
        .maybeSingle()

      if (error) {
        console.log("[AUTH] Ban check error:", error.message)
        return false
      }

      console.log("[AUTH] Ban status:", data?.is_banned)

      return data?.is_banned === true
    } catch (err: any) {
      console.log("[AUTH] Ban check failed:", err?.message ?? err)
      return false
    }
  }

  /* ---------------- SESSION RESTORE ---------------- */

  useEffect(() => {
    let mounted = true

    console.log("[AUTH] Restoring session...")

    const restore = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.log("[AUTH] getSession error:", error.message)
        }

        const restoredSession = data.session
        const userId = restoredSession?.user?.id

        console.log(
          "[AUTH] Session restored:",
          !!restoredSession,
          userId ?? "no-user"
        )

        setSession(restoredSession)
        setLoading(false)

        // ❌ REMOVED duplicate push + RevenueCat from here

        // 🔎 BAN CHECK (still fine here)
        if (userId) {
          checkBanStatus(userId).then(async (isBanned) => {
            if (isBanned) {
              console.log("[AUTH] 🚫 USER BANNED — FORCING LOGOUT")
              await supabase.auth.signOut()
              setSession(null)
            }
          })
        }
      } catch (err: any) {
        console.log("[AUTH] Restore crashed:", err?.message ?? err)
        setLoading(false)
      }
    }

    restore()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("[AUTH] Auth state changed:", event)

        setSession(newSession)

        const userId = newSession?.user?.id

        // ✅ REGISTER PUSH (ONLY HERE)
        if (userId) {
          registerPushToken(userId)
        }

        // ✅ INIT REVENUECAT (ONLY HERE)
        if (userId) {
          await initRevenueCat(userId)
          console.log("🔥 RevenueCat initialized")
        }
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  /* ---------------- LOADING SCREEN ---------------- */

  if (loading) {
    console.log("[AUTH] Still loading session — blocking app render")

    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator size="large" color="#7FAF9B" />
      </View>
    )
  }

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

const styles = StyleSheet.create({
  loaderScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
})