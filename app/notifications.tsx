import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

export default function NotificationsScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const userId = session?.user?.id

  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const loadNotifications = async () => {
      try {
        setLoading(true)

        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })

        if (error) throw error

        setNotifications(data ?? [])
      } catch (err) {
        handleAppError(err, {
          context: "notifications_load",
          fallbackMessage:
            "Failed to load notifications. Please try again.",
        })
        setNotifications([]) // Fail-safe UI
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
  }, [userId])

  const openNotification = async (n: any) => {
    try {
      // Mark as read (non-blocking UX)
      if (!n.read) {
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", n.id)

        if (error) {
          console.error("Mark read error:", error)
          // Silent fail — do NOT block navigation
        }
      }

      // Safe route navigation
      if (n.data?.route) {
        router.push({
          pathname: n.data.route,
          params: n.data.params ?? {},
        })
      }
    } catch (err) {
      handleAppError(err, {
        context: "notifications_open",
        fallbackMessage:
          "Unable to open this notification right now.",
      })
    }
  }

  const clearAllNotifications = async () => {
    if (!userId) return

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", userId)

      if (error) throw error

      setNotifications([])
    } catch (err) {
      handleAppError(err, {
        context: "notifications_clear_all",
        fallbackMessage:
          "Failed to clear notifications. Please try again.",
      })
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Notifications"
        backLabel="Back"
        backRoute={undefined} // uses router.back() internally
      />

      {/* CLEAR ALL */}
      {notifications.length > 0 && (
        <View style={styles.clearRow}>
          <TouchableOpacity onPress={clearAllNotifications}>
            <Text style={styles.clearText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CONTENT */}
      {!userId ? (
        <View style={styles.center}>
          <Ionicons name="notifications-outline" size={56} color="#9FB8AC" />
          <Text style={styles.headline}>Sign in to view notifications</Text>
          <Text style={styles.subtext}>
            Log in to see updates about purchases, offers, and messages.
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <Ionicons name="notifications-outline" size={48} color="#9FB8AC" />
          <Text style={styles.subtext}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-outline" size={56} color="#9FB8AC" />
          <Text style={styles.headline}>No notifications yet</Text>
          <Text style={styles.subtext}>
            Updates about purchases, offers, and messages will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {notifications.map((n) => (
            <Pressable
              key={n.id}
              style={styles.notificationCard}
              onPress={() => openNotification(n)}
            >
              {!n.read && <View style={styles.unreadDot} />}

              <Text
                style={[
                  styles.notifTitle,
                  !n.read && { fontWeight: "900" },
                ]}
              >
                {n.title}
              </Text>

              <Text style={styles.notifBody}>{n.body}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  clearRow: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 6,
  },

  clearText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#C0392B",
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
    textAlign: "center",
  },

  subtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B8F7D",
    textAlign: "center",
    lineHeight: 20,
  },

  notificationCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 14,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    position: "relative",
  },

  unreadDot: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF4D4D",
  },

  notifTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F1E17",
  },

  notifBody: {
    marginTop: 4,
    fontSize: 13,
    color: "#4F6F61",
  },
})
