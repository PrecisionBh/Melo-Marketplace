import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { handleAppError } from "../lib/errors/appError"
import { supabase } from "../lib/supabase"

export default function SettingsScreen() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = () => {
    if (loggingOut) return

    Alert.alert(
      "Log out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: performLogout,
        },
      ]
    )
  }

  const performLogout = async () => {
    if (loggingOut) return

    try {
      setLoggingOut(true)

      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      // Give Supabase a moment to fully clear session to prevent
      // "Missing session" errors on mounted screens
      setTimeout(() => {
        // Hard reset navigation stack (safer than push/back)
        router.replace("/signinscreen")
      }, 50)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to log out. Please check your connection and try again.",
      })
      setLoggingOut(false)
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Settings"
        backLabel="Profile"
        backRoute="/profile"
      />

      {/* ACCOUNT */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <SettingsItem
          icon="person-outline"
          label="Edit account"
          onPress={() => router.push("/settings/edit-account")}
        />

        <SettingsItem
          icon="image-outline"
          label="Edit profile"
          onPress={() => router.push("/settings/edit-profile")}
        />

        <SettingsItem
          icon="notifications-outline"
          label="Notifications"
          onPress={() => router.push("/settings/edit-notifications")}
        />
      </View>

      {/* LEGAL */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>

        <SettingsItem
          icon="document-text-outline"
          label="Legal & Policies"
          onPress={() => router.push("/legal")}
        />
      </View>

      {/* LOGOUT */}
      <View style={styles.content}>
        <TouchableOpacity
          style={[
            styles.logoutBtn,
            loggingOut && { opacity: 0.6 },
          ]}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.9}
        >
          {loggingOut ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="log-out-outline"
                size={20}
                color="#fff"
              />
              <Text style={styles.logoutText}>Log out</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

/* ---------------- ITEM ---------------- */

function SettingsItem({
  icon,
  label,
  onPress,
}: {
  icon: any
  label: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color="#0F1E17" />
      <Text style={styles.itemText}>{label}</Text>
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

  section: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
  },

  sectionTitle: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#6B8F7D",
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E6EFEA",
  },

  itemText: {
    marginLeft: 14,
    fontSize: 15,
    color: "#0F1E17",
    fontWeight: "500",
  },

  content: {
    padding: 20,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#C0392B",
    marginTop: 10,
  },

  logoutText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
})
