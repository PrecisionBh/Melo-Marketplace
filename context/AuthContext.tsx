import { Session } from "@supabase/supabase-js"
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

  const checkBanStatus = async (userId: string): Promise<boolean> => {
    try {
      console.log("[AUTH] Checking ban status for:", userId)

      const { data, error } = await supabase
        .from("profiles")
        .select("is_banned")
        .eq("id", userId)
        .maybeSingle() // ✅ safer than .single()

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

        // ✅ SET SESSION IMMEDIATELY (DO NOT BLOCK ON BAN CHECK)
        setSession(restoredSession)
        setLoading(false)

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