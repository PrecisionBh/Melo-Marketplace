import { useRouter } from "expo-router"
import { useEffect, useRef } from "react"
import { ActivityIndicator, View } from "react-native"
import { useAuth } from "../context/AuthContext"
import { handleAppError } from "../lib/errors/appError"

export default function LoginRedirect() {
  const { session, loading } = useAuth()
  const router = useRouter()

  const hasNavigated = useRef(false)

  useEffect(() => {
    const redirect = async () => {
      try {
        // Prevent double navigation (VERY important in Expo Router)
        if (hasNavigated.current) return

        // Wait until auth finishes loading
        if (loading) return

        hasNavigated.current = true

        if (session) {
          router.replace("/home")
        } else {
          // Safety fallback (prevents infinite spinner if session missing)
          router.replace("/signinscreen")
        }
      } catch (err) {
        console.error("LoginRedirect navigation error:", err)

        handleAppError(err, {
          context: "login_redirect_navigation",
          fallbackMessage: "Failed to redirect. Please restart the app.",
          silent: true, // no user popup for background redirect
        })

        // Absolute fallback (never brick the app)
        try {
          router.replace("/signinscreen")
        } catch {
          // Silent fail to avoid crash loop
        }
      }
    }

    redirect()
  }, [loading, session, router])

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#EAF4EF",
      }}
    >
      <ActivityIndicator size="large" />
    </View>
  )
}
