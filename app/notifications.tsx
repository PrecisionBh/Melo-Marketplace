import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

export default function NotificationsScreen() {
  const router = useRouter()

  return (
    <View style={styles.screen}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>

        <Text style={styles.title}>Notifications</Text>

        <View style={{ width: 22 }} />
      </View>

      {/* CONTENT */}
      <View style={styles.center}>
        <Ionicons
          name="notifications-outline"
          size={56}
          color="#9FB8AC"
        />
        <Text style={styles.headline}>No notifications yet</Text>
        <Text style={styles.subtext}>
          Updates about purchases, offers, and messages will
          appear here.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  topBar: {
    paddingTop: 50,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F1E17",
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#E8F5EE",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  headline: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  subtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B8F7D",
    textAlign: "center",
    lineHeight: 20,
  },
})
