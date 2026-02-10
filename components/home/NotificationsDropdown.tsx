import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

export default function NotificationsDropdown() {
  const router = useRouter()
  const { session } = useAuth()
  const userId = session?.user?.id

  const [notifications, setNotifications] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  const loadNotifications = async () => {
    if (!userId) return

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)

    setNotifications(data ?? [])
  }

  useEffect(() => {
    if (open) {
      loadNotifications()

      // mark as read
      supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false)
    }
  }, [open])

  if (!userId) return null

  return (
    <View>
      {/* BELL ICON */}
      <TouchableOpacity onPress={() => setOpen(!open)}>
        <Ionicons name="notifications-outline" size={22} color="#0F1E17" />
      </TouchableOpacity>

      {/* DROPDOWN */}
      {open && (
        <View style={styles.dropdown}>
          {notifications.length === 0 ? (
            <Text style={styles.empty}>No notifications</Text>
          ) : (
            notifications.map((n) => (
              <View key={n.id} style={styles.item}>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.body}>{n.body}</Text>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.viewAll}
            onPress={() => {
              setOpen(false)
              router.push("/notifications")
            }}
          >
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  dropdown: {
    position: "absolute",
    top: 28,
    right: 0,
    width: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 999,
  },

  item: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF3F0",
  },

  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F1E17",
  },

  body: {
    fontSize: 12,
    color: "#4F6F61",
    marginTop: 2,
  },

  empty: {
    padding: 16,
    textAlign: "center",
    color: "#6B8F7D",
    fontSize: 13,
  },

  viewAll: {
    padding: 10,
    alignItems: "center",
  },

  viewAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F1E17",
  },
})
