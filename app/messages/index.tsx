import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "../../context/AuthContext"
import { handleAppError } from "../../lib/errors/appError"
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
    if (session?.user?.id) {
      loadConversations()
    }
  }, [session?.user?.id])

  const loadConversations = async () => {
    try {
      if (!session?.user?.id) {
        setConversations([])
        return
      }

      setLoading(true)

      const { data, error } = await supabase.rpc(
        "get_user_conversations",
        {
          uid: session.user.id,
        }
      )

      if (error) throw error

      setConversations(data ?? [])
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load conversations.",
      })
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  const openConversation = async (
    conversationId: string
  ) => {
    try {
      if (!session?.user?.id) return

      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", session.user.id)

      router.push(`/messages/${conversationId}`)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to open conversation.",
      })
    }
  }

  const renderItem = ({
    item,
  }: {
    item: Conversation
  }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
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

      <View style={styles.center}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.other_user.display_name}
          </Text>

          <Text style={styles.time}>
            {formatTime(item.last_message_at)}
          </Text>
        </View>

        <Text
          style={styles.preview}
          numberOfLines={1}
        >
          {item.last_message}
        </Text>
      </View>

      {item.unread_count > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>
            {item.unread_count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.pageTitle}>Messages</Text>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              style={{ marginTop: 50 }}
              color="#D97732"
            />
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>
                No messages yet
              </Text>
              <Text style={styles.emptySub}>
                Start a conversation from a listing
              </Text>
            </View>
          )
        }
      />

      <GlobalFooter />
    </View>
  )
}

function formatTime(date: string) {
  const d = new Date(date)

  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F5F1",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 120,
  },

  pageTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 18,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1E7DD",
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 14,
  },

  center: {
    flex: 1,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginRight: 10,
  },

  time: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
  },

  preview: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },

  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: "#D97732",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  unreadText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  emptyWrap: {
    alignItems: "center",
    marginTop: 80,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: "#9CA3AF",
  },
})