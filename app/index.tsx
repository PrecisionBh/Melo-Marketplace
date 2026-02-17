import { useRouter } from "expo-router"
import { useEffect, useRef } from "react"
import { Image, StyleSheet, Text, View } from "react-native"
import { useAuth } from "../context/AuthContext"
import { handleAppError } from "../lib/errors/appError"

const MIN_SPLASH_TIME = 1500 // minimum splash time
const MAX_SPLASH_TIME = 4000 // hard cap safety

export default function Index() {
  const router = useRouter()
  const { session, loading } = useAuth()

  const startTime = useRef(Date.now())
  const hasNavigated = useRef(false)
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null
    let maxTimeout: ReturnType<typeof setTimeout> | null = null

    const navigateSafely = () => {
      if (hasNavigated.current) return
      hasNavigated.current = true

      try {
        if (session) {
          router.replace("/home")
        } else {
          router.replace("/signinscreen")
        }
      } catch (err) {
        console.error("Splash navigation error:", err)

        handleAppError(err, {
          fallbackMessage: "App failed to load correctly.",
        })

        // Absolute fallback route (never brick the app)
        try {
          router.replace("/signinscreen")
        } catch {
          // Silent fail to prevent crash loop
        }
      }
    }

    try {
      if (loading || hasNavigated.current) return

      const elapsed = Date.now() - startTime.current
      const remainingTime = Math.max(MIN_SPLASH_TIME - elapsed, 0)

      timeout = setTimeout(() => {
        navigateSafely()
      }, remainingTime)

      // HARD SAFETY CAP (prevents infinite splash if auth hangs)
      maxTimeout = setTimeout(() => {
        if (hasNavigated.current) return
        console.warn("Splash max timeout reached — forcing navigation")
        navigateSafely()
      }, MAX_SPLASH_TIME)
    } catch (err) {
      console.error("Splash effect error:", err)
      handleAppError(err, {
        fallbackMessage: "Unexpected startup error.",
      })
      navigateSafely()
    }

    return () => {
      if (timeout) clearTimeout(timeout)
      if (maxTimeout) clearTimeout(maxTimeout)
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current)
      }
    }
  }, [loading, session, router])

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/splash-icon.png")}
        style={styles.logo}
        resizeMode="contain"
        onError={(e) => {
          console.error("Splash image failed to load:", e.nativeEvent)
        }}
      />
      <Text style={styles.footer}>Powered by Precision</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 420,
    height: 420,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    fontSize: 12,
    color: "#94A3B8",
  },
})
