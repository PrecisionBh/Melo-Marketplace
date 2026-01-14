import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { supabase } from "../lib/supabase"

export default function SettingsScreen() {
  const router = useRouter()

  const handleLogout = async () => {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut()
            router.replace("/signinscreen") // adjust if needed
          },
        },
      ]
    )
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>

        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* SETTINGS LIST */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <SettingsItem
          icon="person-outline"
          label="Edit account"
          onPress={() =>
            router.push("/settings/edit-account")
          }
        />

        <SettingsItem
          icon="image-outline"
          label="Edit profile"
          onPress={() =>
            router.push("/settings/edit-profile")
          }
        />

        <SettingsItem
          icon="notifications-outline"
          label="Notifications"
          onPress={() =>
            router.push("/settings/edit-notifications")
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payments</Text>

        <SettingsItem
          icon="home-outline"
          label="Shipping address"
          onPress={() =>
            router.push("/settings/address")
          }
        />

        <SettingsItem
          icon="card-outline"
          label="Payment method"
          onPress={() =>
            router.push("/settings/payment")
          }
        />

        <SettingsItem
          icon="cash-outline"
          label="Payouts"
          onPress={() =>
            router.push("/settings/payout")
          }
        />
      </View>

      {/* LOGOUT */}
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color="#fff"
          />
          <Text style={styles.logoutText}>Log out</Text>
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
    >
      <Ionicons
        name={icon}
        size={20}
        color="#0F1E17"
      />
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

  topBar: {
    paddingTop: 50,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
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
