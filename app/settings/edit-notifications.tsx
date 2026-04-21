import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import { Ionicons } from "@expo/vector-icons"
import * as Notifications from "expo-notifications"
import { useEffect, useState } from "react"
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

export default function NotificationsSettingsScreen() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const [pushEnabled, setPushEnabled] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSettings()
    checkDevicePermission()
  }, [])

  const loadSettings = async () => {
    if (!userId) return

    const { data } = await supabase
      .from("profiles")
      .select("notifications_enabled, email_notifications")
      .eq("id", userId)
      .single()

    if (data) {
      setPushEnabled(data.notifications_enabled !== false)
      setEmailEnabled(data.email_notifications !== false)
    }
  }

  const checkDevicePermission = async () => {
    const { status } = await Notifications.getPermissionsAsync()

    if (status !== "granted") {
      setPushEnabled(false)
    }
  }

  const togglePush = async () => {
    if (loading) return

    try {
      setLoading(true)

      let newVal = !pushEnabled

      if (newVal) {
        const { status } =
          await Notifications.requestPermissionsAsync()

        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Enable notifications in your device settings."
          )
          return
        }
      }

      setPushEnabled(newVal)

      await supabase
        .from("profiles")
        .update({ notifications_enabled: newVal })
        .eq("id", userId)

    } catch (err) {
      handleAppError(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleEmail = async () => {
    const newVal = !emailEnabled
    setEmailEnabled(newVal)

    await supabase
      .from("profiles")
      .update({ email_notifications: newVal })
      .eq("id", userId)
  }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>
          Notifications
        </Text>

        {/* 🔥 PUSH */}
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="notifications-outline"
              size={26}
              color="#D97732"
            />
          </View>

          <Text style={styles.title}>
            Push Notifications
          </Text>

          <Text style={styles.text}>
            Get real-time alerts for orders, offers, and messages.
          </Text>

          <View
            style={[
              styles.statusBadge,
              pushEnabled
                ? styles.statusOn
                : styles.statusOff,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                pushEnabled
                  ? styles.statusTextOn
                  : styles.statusTextOff,
              ]}
            >
              {pushEnabled ? "Enabled" : "Disabled"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={togglePush}
          >
            <Text style={styles.toggleText}>
              {pushEnabled
                ? "Disable Notifications"
                : "Enable Notifications"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 🔥 EMAIL */}
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="mail-outline"
              size={26}
              color="#D97732"
            />
          </View>

          <Text style={styles.title}>
            Email Notifications
          </Text>

          <Text style={styles.text}>
            Receive important updates via email.
          </Text>

          <View
            style={[
              styles.statusBadge,
              emailEnabled
                ? styles.statusOn
                : styles.statusOff,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                emailEnabled
                  ? styles.statusTextOn
                  : styles.statusTextOff,
              ]}
            >
              {emailEnabled ? "Enabled" : "Disabled"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={toggleEmail}
          >
            <Text style={styles.toggleText}>
              {emailEnabled
                ? "Disable Email"
                : "Enable Email"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <GlobalFooter />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
  },

  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 10,
  },

  text: {
    textAlign: "center",
    fontSize: 14,
    color: "#666",
    lineHeight: 21,
    marginBottom: 18,
  },

  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 20,
  },

  statusOn: {
    backgroundColor: "#ECFDF5",
  },

  statusOff: {
    backgroundColor: "#F3F4F6",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },

  statusTextOn: {
    color: "#16A34A",
  },

  statusTextOff: {
    color: "#6B7280",
  },

  toggleBtn: {
    backgroundColor: "#D97732",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 18,
  },

  toggleText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
})