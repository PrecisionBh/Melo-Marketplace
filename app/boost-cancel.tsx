import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

export default function BoostCancel() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <Ionicons name="close-circle" size={80} color="#FF6B6B" />
      <Text style={styles.title}>Purchase Cancelled</Text>
      <Text style={styles.subtitle}>
        No charges were made. You can try again anytime.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace("/pro/packages")}
      >
        <Text style={styles.buttonText}>Back to Packages</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1E17",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: "#CCCCCC",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#7FAF9B",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: "#0F1E17",
    fontWeight: "600",
  },
})