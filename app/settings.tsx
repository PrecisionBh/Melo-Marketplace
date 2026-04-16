import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import { useAuth } from "@/context/AuthContext"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import Purchases from "react-native-purchases"

import { handleAppError } from "../lib/errors/appError"
import { supabase } from "../lib/supabase"

export default function SettingsScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const [loggingOut, setLoggingOut] =
    useState(false)

  /* ---------------- RESTORE ---------------- */

  const handleRestore = async () => {
    Alert.alert(
      "Restore Purchases",
      "This will restore your Melo Pro subscription and previous purchases.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Restore",
          onPress: async () => {
            try {
              const customerInfo =
                await Purchases.restorePurchases()

              await supabase.functions.invoke(
                "grant-purchase",
                {
                  body: {
                    productId:
                      "melo_pro_subscription",
                    customerInfo,
                  },
                }
              )

              Alert.alert(
                "Restored",
                "Purchases successfully restored."
              )
            } catch (e) {
              Alert.alert(
                "Error",
                "Failed to restore purchases."
              )
            }
          },
        },
      ]
    )
  }

  /* ---------------- LOGOUT ---------------- */

  const handleLogout = () => {
    if (loggingOut) return

    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: performLogout,
        },
      ]
    )
  }

  const performLogout = async () => {
    try {
      setLoggingOut(true)

      const { error } =
        await supabase.auth.signOut()

      if (error) throw error

      router.replace("/home")
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to log out.",
      })
      setLoggingOut(false)
    }
  }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={styles.pageTitle}>
          Settings
        </Text>

        {/* ACCOUNT */}
        <SettingsSection
          title="Account"
          items={[
            {
              icon: "person-outline",
              label: "Edit Account",
              description:
                "Manage your account details",
              onPress: () =>
                router.push(
                  "/settings/edit-account"
                ),
            },
            {
              icon: "image-outline",
              label: "Address",
              description:
                "Set And Update Your Address",
              onPress: () =>
                router.push(
                  "/settings/edit-profile"
                ),
            },
            {
              icon: "notifications-outline",
              label: "Notifications",
              description:
                "Manage push preferences",
              onPress: () =>
                router.push(
                  "/settings/edit-notifications"
                ),
            },
            {
              icon: "card-outline",
              label: "Manage Subscription",
              description:
                "View or change Melo Pro",
              onPress: () =>
                router.push("/melo-pro"),
            },
            {
              icon: "refresh-outline",
              label: "Restore Purchases",
              description:
                "Restore previous purchases",
              onPress: handleRestore,
            },
          ]}
        />

        {/* LEGAL */}
        <SettingsSection
          title="Legal & Info"
          items={[
            {
              icon: "document-text-outline",
              label: "Terms & Conditions",
              description:
                "Read our terms of service",
              onPress: () =>
                router.push("/legal/terms"),
            },
            {
              icon: "shield-outline",
              label: "Privacy Policy",
              description:
                "How we handle your data",
              onPress: () =>
                router.push("/legal/privacy"),
            },
            {
              icon:
                "shield-checkmark-outline",
              label: "Buyer Protection",
              description:
                "Learn how purchases are protected",
              onPress: () =>
                router.push(
                  "/legal/buyer-protection"
                ),
            },
            {
              icon: "cash-outline",
              label:
                "Seller Payout Policy",
              description:
                "Understand payout timing & rules",
              onPress: () =>
                router.push("/legal/payouts"),
            },
            {
              icon:
                "information-circle-outline",
              label: "About Melo",
              description:
                "Learn more about our mission",
              onPress: () =>
                router.push("/legal/about"),
            },
            {
              icon: "help-circle-outline",
              label: "FAQs",
              description:
                "Common questions answered",
              onPress: () =>
                router.push("/legal/faqs"),
            },
            {
              icon: "mail-outline",
              label: "Contact Support",
              description:
                "Need help? Reach out to us",
              onPress: () =>
                router.push("/legal/contact"),
            },
          ]}
        />

       <TouchableOpacity
  style={styles.logoutBtn}
  onPress={() => {
    if (session) {
      handleLogout()
    } else {
      router.push("/login")
    }
  }}
  disabled={loggingOut}
>
  {loggingOut ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <>
      <Ionicons
        name={
          session
            ? "log-out-outline"
            : "log-in-outline"
        }
        size={18}
        color="#fff"
      />
      <Text style={styles.logoutText}>
        {session ? "Log Out" : "Sign In"}
      </Text>
    </>
  )}
</TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() =>
            router.push(
              "/settings/delete-account"
            )
          }
        >
          <Text style={styles.deleteText}>
            Delete Account
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <GlobalFooter />
    </View>
  )
}

/* ---------------- SECTION ---------------- */

function SettingsSection({
  title,
  items,
}: {
  title: string
  items: any[]
}) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <View style={styles.sectionCard}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.item,
              i !== items.length - 1 &&
                styles.itemBorder,
            ]}
            onPress={item.onPress}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={item.icon}
                size={18}
                color="#111"
              />
            </View>

            <View style={styles.itemTextWrap}>
              <Text style={styles.itemLabel}>
                {item.label}
              </Text>
              <Text
                style={styles.itemDesc}
              >
                {item.description}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

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

  sectionWrap: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 10,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    overflow: "hidden",
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },

  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },

  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  itemTextWrap: {
    flex: 1,
  },

  itemLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },

  itemDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  logoutBtn: {
    backgroundColor: "#D97732",
    borderRadius: 18,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },

  logoutText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  deleteBtn: {
    marginTop: 14,
    alignItems: "center",
  },

  deleteText: {
    color: "#C0392B",
    fontWeight: "700",
    fontSize: 13,
  },
})