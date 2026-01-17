import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "../../context/AuthContext"
import { supabase } from "../../lib/supabase"

type Conversation = {
  id: string
  last_message: string
  last_message_at: string
  unread_count: number
  other_user: {
    id: string
    display_name: string
    avatar_url: string | null
  }
}

export default function MessagesScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversations()
  }, [])

  /* ---------------- LOAD CONVERSATIONS ---------------- */

  const loadConversations = async () => {
    if (!session?.user) return

    const { data, error } = await supabase.rpc(
      "get_user_conversations",
      { uid: session.user.id }
    )

    if (error) {
      console.error("loadConversations error:", error)
      setLoading(false)
      return
    }

    setConversations(data ?? [])
    setLoading(false)
  }

  /* ---------------- OPEN CHAT ---------------- */

  const openConversation = async (conversationId: string) => {
    if (!session?.user) return

    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", session.user.id)

    router.push(`/messages/${conversationId}`)
  }

  /* ---------------- RENDER ITEM ---------------- */

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => openConversation(item.id)}
    >
      <Image
        source={
          item.other_user.avatar_url
            ? { uri: item.other_user.avatar_url }
            : require("../../assets/images/avatar-placeholder.png")
        }
        style={styles.avatar}
      />

      <View style={styles.textWrap}>
        <Text style={styles.name}>
          {item.other_user.display_name}
        </Text>

        <Text style={styles.preview} numberOfLines={1}>
          {item.last_message}
        </Text>
      </View>

      <View style={styles.rightWrap}>
        <Text style={styles.time}>
          {formatTime(item.last_message_at)}
        </Text>

        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unread_count}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.screen}>
      {/* SAGE HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Messages</Text>

        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  )
}

/* ---------------- HELPERS ---------------- */

function formatTime(date: string) {
  const d = new Date(date)
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  /* SAGE HEADER */
  header: {
    paddingTop: 60,
    paddingBottom: 14,
    paddingHorizontal: 14,
    backgroundColor: "#7FAF9B", // 🌿 sage green
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D6E6DE",
    backgroundColor: "#fff",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },

  textWrap: {
    flex: 1,
  },

  name: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F1E17",
  },

  preview: {
    marginTop: 2,
    fontSize: 13,
    color: "#6B8F7D",
  },

  rightWrap: {
    alignItems: "flex-end",
    gap: 6,
  },

  time: {
    fontSize: 11,
    color: "#6B8F7D",
  },

  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#0F1E17",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  unreadText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
})
