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

  useEffect(() => {
    let mounted = true

    console.log("[AUTH] Restoring session...")

    // 🔒 Restore session on app load (CRITICAL FOR NO FLICKER)
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return

      if (error) {
        console.log("[AUTH] getSession error:", error.message)
      }

      console.log(
        "[AUTH] Session restored:",
        !!data.session,
        data.session?.user?.id ?? "no-user"
      )

      setSession(data.session)
      setLoading(false)
    })

    // 🔁 Listen for login / logout changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("[AUTH] Auth state changed:", event)
        setSession(newSession)
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // 🚀 THIS IS THE FIX FOR YOUR FLASHING BUG
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
    backgroundColor: "#FFFFFF", // Matches your Melo login theme
    justifyContent: "center",
    alignItems: "center",
  },
})
