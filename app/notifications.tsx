import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { Swipeable } from "react-native-gesture-handler"

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
          .eq("cleared", false)
          .eq("read", false)
          .order("created_at", { ascending: false })

        if (error) throw error

        setNotifications(data ?? [])
      } catch (err) {
        handleAppError(err, {
          context: "notifications_load",
          fallbackMessage:
            "Failed to load notifications. Please try again.",
        })
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
  }, [userId])

  const openNotification = async (n: any) => {
    try {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === n.id ? { ...notif, read: true } : notif
        )
      )

      if (!n.read) {
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", n.id)

        if (error) {
          console.error("Mark read error:", error)
        }
      }

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

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ cleared: true })
        .eq("id", id)

      if (error) throw error

      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (err) {
      handleAppError(err, {
        context: "notifications_delete",
        fallbackMessage: "Failed to delete notification.",
      })
    }
  }

  const renderRightActions = (id: string) => (
    <TouchableOpacity
      onPress={() => deleteNotification(id)}
      style={styles.deleteButton}
      activeOpacity={0.85}
    >
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  )

  const clearAllNotifications = async () => {
    if (!userId) return

    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          cleared: true,
          read: true,
        })
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

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.unreadCount}>
                {unreadCount} unread
              </Text>
            )}
          </View>

          {notifications.length > 0 && (
            <TouchableOpacity
              onPress={clearAllNotifications}
              activeOpacity={0.85}
              style={styles.clearButton}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={14}
                color="#D97732"
              />
              <Text style={styles.clearButtonText}>
                Clear all
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!userId ? (
          <View style={styles.emptyWrap}>
            <Ionicons
              name="notifications-outline"
              size={54}
              color="#D1D5DB"
            />
            <Text style={styles.emptyTitle}>
              Sign in to view notifications
            </Text>
            <Text style={styles.emptySub}>
              Log in to see updates about purchases, offers, and messages.
            </Text>
          </View>
        ) : loading ? (
          <View style={styles.emptyWrap}>
            <Ionicons
              name="notifications-outline"
              size={48}
              color="#D1D5DB"
            />
            <Text style={styles.emptySub}>
              Loading notifications...
            </Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons
              name="notifications-outline"
              size={54}
              color="#D1D5DB"
            />
            <Text style={styles.emptyTitle}>
              No notifications yet
            </Text>
            <Text style={styles.emptySub}>
              You’ll see updates about orders, offers, and messages here.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {notifications.map((n) => (
              <Swipeable
                key={n.id}
                renderRightActions={() => renderRightActions(n.id)}
                overshootRight={false}
              >
                <Pressable
                  style={styles.notificationCard}
                  onPress={() => openNotification(n)}
                >
                  <View style={styles.cardLeft}>
                    {!n.read && <View style={styles.unreadDot} />}
                  </View>

                  <View style={styles.cardBody}>
                    <Text
                      style={[
                        styles.notifTitle,
                        !n.read && styles.notifTitleUnread,
                      ]}
                    >
                      {n.title}
                    </Text>

                    <Text style={styles.notifBody}>
                      {n.body}
                    </Text>
                  </View>
                </Pressable>
              </Swipeable>
            ))}
          </ScrollView>
        )}
      </View>

      <GlobalFooter />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F5F1",
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 120,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  pageTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111827",
  },

  unreadCount: {
    marginTop: 4,
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F4D7B8",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  clearButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D97732",
  },

  listContent: {
    paddingBottom: 10,
  },

  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1E7DD",
    padding: 16,
    marginBottom: 10,
  },

  cardLeft: {
    width: 16,
    alignItems: "center",
    paddingTop: 4,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D97732",
  },

  cardBody: {
    flex: 1,
  },

  notifTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  notifTitleUnread: {
    fontWeight: "900",
  },

  notifBody: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
  },

  deleteButton: {
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    width: 92,
    marginVertical: 4,
    borderRadius: 18,
  },

  deleteText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
  },

  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  emptySub: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#9CA3AF",
    textAlign: "center",
  },
})