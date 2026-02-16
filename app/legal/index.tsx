import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import React from "react"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"

import AppHeader from "@/components/app-header"

export default function LegalIndexScreen() {
  const router = useRouter()

  return (
    <View style={styles.screen}>
      {/* STANDARDIZED HEADER */}
      <AppHeader
        title="Legal & Info"
        backLabel="Settings"
        backRoute="/settings"
      />

      {/* MENU */}
      <View style={styles.menu}>
        <MenuItem
          icon="document-text-outline"
          label="Terms & Conditions"
          onPress={() => router.push("/legal/terms")}
        />

        <MenuItem
          icon="shield-checkmark-outline"
          label="Buyer Protection"
          onPress={() => router.push("/legal/buyer-protection")}
        />

        <MenuItem
          icon="cash-outline"
          label="Seller Payout Policy"
          onPress={() => router.push("/legal/payouts")}
        />

        <MenuItem
          icon="information-circle-outline"
          label="About Melo"
          onPress={() => router.push("/legal/about")}
        />

        <MenuItem
          icon="help-circle-outline"
          label="FAQs"
          onPress={() => router.push("/legal/faqs")}
        />
      </View>
    </View>
  )
}

/* ---------------- MENU ITEM ---------------- */

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: any
  label: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color="#0F1E17" />
      <Text style={styles.menuText}>{label}</Text>
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
    marginTop: 10,
    backgroundColor: "#FFFFFF",
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E6EFEA",
  },

  menuText: {
    marginLeft: 14,
    fontSize: 15,
    color: "#0F1E17",
    fontWeight: "500",
  },
})
