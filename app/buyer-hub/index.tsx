import AppHeader from "@/components/app-header"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

/* ---------------- SCREEN ---------------- */

export default function BuyerHubScreen() {
  const router = useRouter()

  return (
    <View style={styles.screen}>
      {/* STANDARDIZED HEADER */}
      <AppHeader
        title="Buying"
        backLabel="Profile"
        backRoute="/profile"
      />

      {/* MENU */}
      <View style={styles.menu}>
        <HubButton
          icon="cube-outline"
          label="My Orders"
          onPress={() => router.push("/buyer-hub/orders")}
        />

        <HubButton
          icon="pricetag-outline"
          label="My Offers"
          onPress={() => router.push("/buyer-hub/offers")}
        />

        <HubButton
          icon="chatbubble-ellipses-outline"
          label="Messages"
          onPress={() => router.push("/messages")}
        />

        <HubButton
          icon="settings-outline"
          label="Settings"
          onPress={() => router.push("/settings")}
        />
      </View>
    </View>
  )
}

/* ---------------- HUB BUTTON ---------------- */

function HubButton({
  icon,
  label,
  onPress,
}: {
  icon: any
  label: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Ionicons name={icon} size={22} color="#0F1E17" />
      <Text style={styles.buttonText}>{label}</Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color="#9FB8AC"
        style={{ marginLeft: "auto" }}
      />
    </TouchableOpacity>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  menu: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E6EFEA",
  },

  buttonText: {
    marginLeft: 14,
    fontSize: 15,
    fontWeight: "600",
    color: "#0F1E17",
  },
})
