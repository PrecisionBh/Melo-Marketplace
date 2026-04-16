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

import { handleAppError } from "@/lib/errors/appError"

export default function NotificationsSettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] =
    useState(false)

  const [loading, setLoading] =
    useState(false)

  useEffect(() => {
    checkPermissionStatus()
  }, [])

  const checkPermissionStatus = async () => {
    try {
      const { status } =
        await Notifications.getPermissionsAsync()

      setNotificationsEnabled(
        status === "granted"
      )
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to check notification permissions.",
        silent: true,
      })
    }
  }

  const handleToggleNotifications =
    async () => {
      if (loading) return

      try {
        setLoading(true)

        if (!notificationsEnabled) {
          const { status } =
            await Notifications.requestPermissionsAsync()

          if (status !== "granted") {
            Alert.alert(
              "Permission Required",
              "Notifications are disabled at the device level. Please enable them in your phone settings."
            )
            return
          }

          setNotificationsEnabled(true)

          Alert.alert(
            "Notifications Enabled",
            "You will now receive Melo alerts."
          )
        } else {
          setNotificationsEnabled(false)

          Alert.alert(
            "Notifications Disabled",
            "You can re-enable notifications anytime."
          )
        }
      } catch (err) {
        handleAppError(err, {
          fallbackMessage:
            "Failed to update notification settings.",
        })
      } finally {
        setLoading(false)
      }
    }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={styles.pageTitle}>
          Notifications
        </Text>

        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={
                notificationsEnabled
                  ? "notifications"
                  : "notifications-outline"
              }
              size={26}
              color="#D97732"
            />
          </View>

          <Text style={styles.title}>
            Push Notifications
          </Text>

          <Text style={styles.text}>
            Get real-time alerts for new
            messages, order updates,
            offers, and important Melo
            activity.
          </Text>

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
              {notificationsEnabled
                ? "Enabled"
                : "Disabled"}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.toggleBtn,
              loading && {
                opacity: 0.6,
              },
            ]}
            onPress={
              handleToggleNotifications
            }
            disabled={loading}
          >
            <Ionicons
              name={
                notificationsEnabled
                  ? "notifications-off"
                  : "notifications"
              }
              size={18}
              color="#fff"
            />

            <Text
              style={styles.toggleText}
            >
              {notificationsEnabled
                ? "Disable Notifications"
                : "Enable Notifications"}
            </Text>
          </TouchableOpacity>

          <Text
            style={styles.helperText}
          >
            Melo only sends relevant
            marketplace notifications.
          </Text>
        </View>
      </ScrollView>

      <GlobalFooter />
    </View>
  )
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#F8F8F8",
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
      backgroundColor:
        "#fff",
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "#E8E8E8",
      padding: 22,
      alignItems: "center",
    },

    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor:
        "#FFF7ED",
      alignItems: "center",
      justifyContent:
        "center",
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
      backgroundColor:
        "#ECFDF5",
    },

    statusOff: {
      backgroundColor:
        "#F3F4F6",
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
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor:
        "#D97732",
      paddingVertical: 14,
      paddingHorizontal: 22,
      borderRadius: 18,
    },

    toggleText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 14,
    },

    helperText: {
      marginTop: 14,
      textAlign: "center",
      fontSize: 12,
      color: "#888",
      lineHeight: 18,
    },
  })