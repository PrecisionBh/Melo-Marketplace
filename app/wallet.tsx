import { useRouter } from "expo-router"
import { useEffect } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"

export default function WalletRedirectScreen() {
  const router = useRouter()

  useEffect(() => {
    // Small delay ensures router is mounted before redirect
    const timeout = setTimeout(() => {
      router.replace("/seller-hub/wallet")
    }, 300)

    return () => clearTimeout(timeout)
  }, [])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#7FAF9B" />
      <Text style={styles.text}>Returning to your wallet…</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EAF4EF",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F1E17",
  },
})
