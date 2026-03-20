import { Session } from "@supabase/supabase-js"
import * as Notifications from "expo-notifications"
import React, { createContext, useContext, useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { supabase } from "../lib/supabase"

type AuthContextType = {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  /* ---------------- PUSH REGISTRATION ---------------- */

  const registerPushToken = async (userId: string) => {
    try {
      console.log("[PUSH] Registering push token...")

      const { status } = await Notifications.requestPermissionsAsync()
      if (status !== "granted") {
        console.log("[PUSH] Permission not granted")
        return
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: "d3c5c61c-a428-41f5-b2cd-ce9bc35b2f3c", // ✅ CORRECT EXPO ID
      })

      console.log("[PUSH] TOKEN:", token.data)

      await supabase
        .from("profiles")
        .update({ push_token: token.data })
        .eq("id", userId)

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

        // ✅ REGISTER PUSH TOKEN
        if (userId) {
          registerPushToken(userId)
        }

        // 🔎 Run ban check in background
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

        // ✅ REGISTER PUSH ON LOGIN / SESSION CHANGE
        if (userId) {
          registerPushToken(userId)
        }

        if (userId) {
          checkBanStatus(userId).then(async (isBanned) => {
            if (isBanned) {
              console.log("[AUTH] 🚫 BANNED USER — FORCING SIGN OUT")
              await supabase.auth.signOut()
              setSession(null)
            }
          })
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