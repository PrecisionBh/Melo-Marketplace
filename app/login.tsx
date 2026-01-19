import { useRouter } from "expo-router"
import { useEffect } from "react"
import { ActivityIndicator, View } from "react-native"
import { useAuth } from "../context/AuthContext"

export default function LoginRedirect() {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && session) {
      router.replace("/home")
    }
  }, [loading, session])

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  )
}
