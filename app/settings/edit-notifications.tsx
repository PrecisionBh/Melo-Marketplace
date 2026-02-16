import { Ionicons } from "@expo/vector-icons"
import * as Notifications from "expo-notifications"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native"

export default function NotificationsSettingsScreen() {
  const router = useRouter()

  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkPermissionStatus()
  }, [])

  const checkPermissionStatus = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync()
      setNotificationsEnabled(status === "granted")
    } catch (e) {
      console.error("Permission check error:", e)
    }
  }

  const handleToggleNotifications = async () => {
    try {
      setLoading(true)

      if (!notificationsEnabled) {
        // Request permission
        const { status } = await Notifications.requestPermissionsAsync()

        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Enable notifications to receive message alerts, order updates, and important Melo notifications."
          )
          setLoading(false)
          return
        }

        // Permission granted
        setNotificationsEnabled(true)

        Alert.alert(
          "Notifications Enabled",
          "You will now receive alerts for messages, orders, and important updates."
        )
      } else {
        // Cannot truly disable system permission from app,
        // but we toggle app-level preference for MVP
        setNotificationsEnabled(false)

        Alert.alert(
          "Notifications Disabled",
          "You can re-enable notifications anytime from this screen."
        )
      }

      setLoading(false)
    } catch (e) {
      console.error("Notification toggle error:", e)
      setLoading(false)
      Alert.alert("Error", "Something went wrong while updating notification settings.")
    }
  }

  return (
    <View style={styles.screen}>
      {/* 🌿 HEADER */}
      <View style={styles.headerWrap}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push("/settings")}
          >
            <Ionicons name="arrow-back" size={22} color="#0F1E17" />
            <Text style={styles.headerSub}>Settings</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Notifications</Text>

          <View style={{ width: 60 }} />
        </View>
      </View>

      {/* MAIN CARD */}
      <View style={styles.card}>
        <Ionicons
          name={notificationsEnabled ? "notifications" : "notifications-outline"}
          size={42}
          color="#7FAF9B"
        />

        <Text style={styles.title}>Push Notifications</Text>

        <Text style={styles.text}>
          Get real-time alerts for new messages, order updates, offers,
          and important Melo activity. Keeping notifications enabled
          ensures you never miss a sale or message.
        </Text>

        {/* STATUS BADGE */}
        <View
          style={[
            styles.statusBadge,
            notificationsEnabled
              ? styles.statusOn
              : styles.statusOff,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              notificationsEnabled
                ? styles.statusTextOn
                : styles.statusTextOff,
            ]}
          >
            {notificationsEnabled ? "Enabled" : "Disabled"}
          </Text>
        </View>

        {/* TOGGLE BUTTON */}
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            loading && { opacity: 0.6 },
          ]}
          onPress={handleToggleNotifications}
          disabled={loading}
        >
          <Ionicons
            name={
              notificationsEnabled ? "notifications-off" : "notifications"
            }
            size={18}
            color="#FFFFFF"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.toggleText}>
            {notificationsEnabled
              ? "Disable Notifications"
              : "Enable Notifications"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.helperText}>
          You can change this anytime. Melo will only send important,
          relevant notifications.
        </Text>
      </View>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  /* 🌿 SAGE HEADER */
  headerWrap: {
    backgroundColor: "#7FAF9B",
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },

  headerBtn: {
    alignItems: "center",
    minWidth: 60,
  },

  headerSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#0F1E17",
  },

  card: {
    margin: 20,
    padding: 24,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  title: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  text: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 13,
    color: "#6B8F7D",
    lineHeight: 18,
  },

  statusBadge: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusOn: {
    backgroundColor: "#E6F4EE",
  },

  statusOff: {
    backgroundColor: "#F1F1F1",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  statusTextOn: {
    color: "#2E7D5B",
  },

  statusTextOff: {
    color: "#888888",
  },

  toggleBtn: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1E17",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },

  toggleText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  helperText: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 12,
    color: "#8AA79A",
  },
})
