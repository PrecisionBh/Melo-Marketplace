import { Ionicons } from "@expo/vector-icons"
import { Href, useRouter } from "expo-router"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type AppHeaderProps = {
  title: string
  backLabel?: string
  backRoute?: Href // ✅ FIXED: proper Expo Router type
}

export default function AppHeader({
  title,
  backLabel = "Back",
  backRoute,
}: AppHeaderProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const handleBack = () => {
    if (backRoute) {
      router.push(backRoute)
    } else {
      router.back()
    }
  }

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      {/* BACK BUTTON */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={handleBack}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={20} color="#E8F5EE" />
        <Text style={styles.backText}>{backLabel}</Text>
      </TouchableOpacity>

      {/* TITLE */}
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7FAF9B", // Melo locked header color
  },

  backBtn: {
    position: "absolute",
    left: 16,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  backText: {
    marginLeft: 6,
    color: "#E8F5EE",
    fontWeight: "600",
    fontSize: 13,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#E8F5EE",
    letterSpacing: 0.3,
  },
})
