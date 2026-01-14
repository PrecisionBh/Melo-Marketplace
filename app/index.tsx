import { useRouter } from "expo-router"
import { useEffect, useRef } from "react"
import { Image, StyleSheet, Text, View } from "react-native"
import { useAuth } from "../context/AuthContext"

const MIN_SPLASH_TIME = 3000 // 3s minimum
const MAX_SPLASH_TIME = 5000 // 5s hard cap

export default function Index() {
  const router = useRouter()
  const { session, loading } = useAuth()

  const startTime = useRef(Date.now())
  const hasNavigated = useRef(false)

  useEffect(() => {
    if (loading || hasNavigated.current) return

    const elapsed = Date.now() - startTime.current
    const remainingTime = Math.max(MIN_SPLASH_TIME - elapsed, 0)

    const timeout = setTimeout(() => {
      if (hasNavigated.current) return
      hasNavigated.current = true

      if (session) {
        router.replace("/home")
      } else {
        router.replace("/signinscreen")
      }
    }, remainingTime)

    const maxTimeout = setTimeout(() => {
      if (hasNavigated.current) return
      hasNavigated.current = true

      if (session) {
        router.replace("/home")
      } else {
        router.replace("/signinscreen")
      }
    }, MAX_SPLASH_TIME)

    return () => {
      clearTimeout(timeout)
      clearTimeout(maxTimeout)
    }
  }, [loading, session])

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/splash-icon.png")}
        style={styles.logo}
        resizeMode="contain"
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
