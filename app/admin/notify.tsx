import { useState } from "react"
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

import { AdminGate } from "@/lib/adminGate"
import { supabase } from "@/lib/supabase"

/* ---------------- TYPES ---------------- */

type Mode = "global" | "user"

/* ---------------- SCREEN ---------------- */

function AdminNotifyScreen() {
  const [mode, setMode] = useState<Mode>("global")
  const [userId, setUserId] = useState("")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  const sendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert("Title and message required")
      return
    }

    if (mode === "user" && !userId.trim()) {
      Alert.alert("User ID required")
      return
    }

    setSending(true)

    try {
      if (mode === "global") {
        const { data: users, error } = await supabase
          .from("profiles")
          .select("id")

        if (error) throw error

        if (users?.length) {
          const rows = users.map((u) => ({
            topic: "admin_notice",
            event: "global_announcement",
            extension: "system",
            body: `${title}\n\n${message}`,
            payload: {
              to_user_id: u.id,
            },
            private: true,
          }))

          await supabase.from("messages").insert(rows)
        }
      } else {
        await supabase.from("messages").insert({
          topic: "admin_notice",
          event: "direct_notice",
          extension: "system",
          body: `${title}\n\n${message}`,
          payload: {
            to_user_id: userId,
          },
          private: true,
        })
      }

      Alert.alert("Notification sent")
      setTitle("")
      setMessage("")
      setUserId("")
    } catch (e) {
      console.error(e)
      Alert.alert("Failed to send notification")
    }

    setSending(false)
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Notifications</Text>
      </View>

      <View style={styles.content}>
        {/* MODE TOGGLE */}
        <View style={styles.toggleRow}>
          <Toggle
            label="Global"
            active={mode === "global"}
            onPress={() => setMode("global")}
          />
          <Toggle
            label="Single User"
            active={mode === "user"}
            onPress={() => setMode("user")}
          />
        </View>

        {mode === "user" && (
          <TextInput
            style={styles.input}
            placeholder="User ID"
            value={userId}
            onChangeText={setUserId}
            autoCapitalize="none"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Notification title"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Notification message"
          value={message}
          onChangeText={setMessage}
          multiline
        />

        <TouchableOpacity
          style={[styles.sendBtn, sending && { opacity: 0.6 }]}
          onPress={sendNotification}
          disabled={sending}
        >
          <Text style={styles.sendText}>
            {sending ? "Sending..." : "Send Notification"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          These appear in user Messages as Admin Notices.
          Push notifications can be layered later using the same events.
        </Text>
      </View>
    </View>
  )
}

/* ---------------- TOGGLE ---------------- */

function Toggle({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.toggleBtn, active && styles.toggleActive]}
      onPress={onPress}
    >
      <Text
        style={[styles.toggleText, active && styles.toggleTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
}

/* ---------------- EXPORT ---------------- */

export default function AdminNotify() {
  return (
    <AdminGate>
      <AdminNotifyScreen />
    </AdminGate>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

  header: {
    paddingTop: 60,
    paddingBottom: 14,
    alignItems: "center",
    backgroundColor: "#7FAF9B",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  content: { padding: 16 },

  toggleRow: {
    flexDirection: "row",
    marginBottom: 12,
  },

  toggleBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    marginRight: 8,
  },

  toggleActive: {
    backgroundColor: "#0F1E17",
  },

  toggleText: {
    textAlign: "center",
    fontWeight: "800",
  },

  toggleTextActive: {
    color: "#fff",
  },

  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },

  textarea: {
    height: 120,
    textAlignVertical: "top",
  },

  sendBtn: {
    backgroundColor: "#0F1E17",
    padding: 14,
    borderRadius: 14,
    marginTop: 10,
  },

  sendText: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
  },

  note: {
    marginTop: 12,
    fontSize: 12,
    color: "#6B8F7D",
    textAlign: "center",
  },
})
