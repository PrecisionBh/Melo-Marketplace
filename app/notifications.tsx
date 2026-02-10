import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

export default function NotificationsScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const userId = session?.user?.id

  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const loadNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      setNotifications(data ?? [])
      setLoading(false)

      // mark all as read
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false)
    }

    loadNotifications()
  }, [userId])

  return (
    <View style={styles.screen}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#E8F5EE" />
        </TouchableOpacity>

        <Text style={styles.title}>Notifications</Text>

        <View style={{ width: 22 }} />
      </View>

      {/* CONTENT */}
      {!userId ? (
        <View style={styles.center}>
          <Ionicons name="notifications-outline" size={56} color="#9FB8AC" />
          <Text style={styles.headline}>Sign in to view notifications</Text>
          <Text style={styles.subtext}>
            Log in to see updates about purchases, offers, and messages.
          </Text>
        </View>
      ) : loading ? null : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-outline" size={56} color="#9FB8AC" />
          <Text style={styles.headline}>No notifications yet</Text>
          <Text style={styles.subtext}>
            Updates about purchases, offers, and messages will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView>
          {notifications.map((n) => (
            <View key={n.id} style={styles.notificationCard}>
              <Text style={styles.notifTitle}>{n.title}</Text>
              <Text style={styles.notifBody}>{n.body}</Text>
            </View>
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
