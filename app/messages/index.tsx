import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable"

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
  const [search, setSearch] = useState("")

  const conversationChannelRef = useRef<any>(null)

  /* ---------------- INITIAL LOAD ---------------- */

  useEffect(() => {
    console.log("🟢 MessagesScreen mounted")

    if (session?.user?.id) {
      console.log("👤 User detected:", session.user.id)
      loadConversations()
    } else {
      console.log("⚠️ No user session")
    }
  }, [session?.user?.id])

  /* ---------------- REALTIME ---------------- */

  useEffect(() => {
    console.log("🟡 Realtime useEffect triggered")

    if (!session?.user?.id) {
      console.log("❌ No session, skipping realtime")
      return
    }

    console.log("🟢 Creating conversation-updates channel")

    const channel = supabase
      .channel(`conversation-updates-${session.user.id}-${Date.now()}`)

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          console.log("📡 REALTIME MESSAGE INSERT:", payload)
          console.log("🔄 Reloading conversations...")
          loadConversations()
        }
      )

      .subscribe((status) => {
        console.log("📡 Conversation channel status:", status)
      })

    conversationChannelRef.current = channel

    return () => {
      console.log("🧹 Cleaning up conversation channel")

      if (conversationChannelRef.current) {
        supabase.removeChannel(conversationChannelRef.current)
        conversationChannelRef.current = null
      }
    }
  }, [session?.user?.id])

  /* ---------------- LOAD CONVERSATIONS ---------------- */

  const loadConversations = async () => {
    try {
      console.log("📥 loadConversations CALLED")

      if (!session?.user?.id) {
        console.log("❌ No user ID — clearing conversations")
        setConversations([])
        return
      }

      setLoading(true)

      console.log("📡 Fetching conversations via RPC...")

      const { data, error } = await supabase.rpc(
        "get_user_conversations",
        {
          uid: session.user.id,
        }
      )

      if (error) {
        console.log("❌ RPC ERROR:", error)
        throw error
      }

      console.log("📦 Raw conversations:", data)

      const filtered =
        (data ?? []).filter(
          (c: Conversation) =>
            c.last_message && c.last_message.trim() !== ""
        )

      console.log("🧹 Filtered conversations:", filtered.length)

      const sorted = filtered.sort(
        (a: Conversation, b: Conversation) =>
          new Date(b.last_message_at || 0).getTime() -
          new Date(a.last_message_at || 0).getTime()
      )

      console.log("🔼 Sorted conversations:", sorted.length)

      setConversations(sorted)
    } catch (err) {
      console.log("💥 loadConversations FAILED:", err)

      handleAppError(err, {
        fallbackMessage: "Failed to load conversations.",
      })

      setConversations([])
    } finally {
      setLoading(false)
      console.log("✅ loadConversations DONE")
    }
  }

  /* ---------------- OPEN CONVERSATION ---------------- */

  const openConversation = async (conversationId: string) => {
    try {
      console.log("👉 Opening conversation:", conversationId)

      if (!session?.user?.id) {
        console.log("❌ No session user")
        return
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, unread_count: 0 }
            : c
        )
      )

      console.log("👁 Marking messages as read...")

      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", session.user.id)

      console.log("🚀 Navigating to chat screen")

      router.push(`/messages/${conversationId}`)
    } catch (err) {
      console.log("💥 openConversation ERROR:", err)

      handleAppError(err, {
        fallbackMessage: "Failed to open conversation.",
      })
    }
  }

  const filteredConversations =
  conversations.filter((c) => {
    const searchLower =
      search.toLowerCase()

    return (
      c.other_user.display_name
        ?.toLowerCase()
        .includes(searchLower) ||
      c.last_message
        ?.toLowerCase()
        .includes(searchLower)
    )
  })

const deleteConversation = async (
  conversationId: string
) => {
  try {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this conversation?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!session?.user?.id) return

            const { error } =
              await supabase.rpc(
                "delete_conversation_for_me",
                {
                  conversation_id_input:
                    conversationId,
                  user_id_input:
                    session.user.id,
                }
              )

            if (error) throw error

            setConversations((prev) =>
              prev.filter(
                (c) =>
                  c.id !==
                  conversationId
              )
            )
          },
        },
      ]
    )
  } catch (err) {
    handleAppError(err, {
      fallbackMessage:
        "Failed to delete conversation.",
    })
  }
}

/* ---------------- RENDER ---------------- */

  const renderItem = ({
  item,
}: {
  item: Conversation
}) => {
  return (
    <Swipeable
      renderRightActions={() => (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() =>
            deleteConversation(item.id)
          }
        >
          <Ionicons
            name="trash-outline"
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
      )}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          openConversation(item.id)
        }
      >
        <Image
          source={
            item.other_user.avatar_url
              ? {
                  uri:
                    item.other_user.avatar_url,
                }
              : require("../../assets/images/avatar-placeholder.png")
          }
          style={styles.avatar}
        />

        <View style={styles.center}>
          <View style={styles.topRow}>
            <Text
              style={styles.name}
              numberOfLines={1}
            >
              {
                item.other_user
                  .display_name
              }
            </Text>

            <Text style={styles.time}>
              {formatTime(
                item.last_message_at
              )}
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
            <Text
              style={styles.unreadText}
            >
              {item.unread_count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  )
}

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
  <View>
    <Text style={styles.pageTitle}>
      Messages
    </Text>

    <View style={styles.searchWrap}>
      <Ionicons
        name="search-outline"
        size={18}
        color="#9CA3AF"
      />

      <TextInput
        placeholder="Search messages..."
        placeholderTextColor="#9CA3AF"
        value={search}
        onChangeText={setSearch}
        style={styles.searchInput}
      />
    </View>
  </View>
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
  screen: { flex: 1, backgroundColor: "#F8F5F1" },
  listContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 120 },
  pageTitle: { fontSize: 30, fontWeight: "900", marginBottom: 18 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 20,
    marginBottom: 10,
  },
  avatar: { width: 54, height: 54, borderRadius: 27, marginRight: 14 },
  center: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between" },
  name: { fontSize: 15, fontWeight: "800" },
  time: { fontSize: 11, color: "#9CA3AF" },
  preview: { marginTop: 4, fontSize: 13, color: "#6B7280" },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#D97732",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  searchWrap: {
  flexDirection: "row",
  alignItems: "center",

  backgroundColor: "#fff",

  borderRadius: 16,

  paddingHorizontal: 14,
  paddingVertical: 12,

  marginBottom: 16,
},

searchInput: {
  flex: 1,

  marginLeft: 8,

  fontSize: 14,

  color: "#111827",
},

deleteBtn: {
  width: 80,

  backgroundColor: "#EF4444",

  borderRadius: 20,

  marginBottom: 10,

  alignItems: "center",
  justifyContent: "center",
},
  emptyWrap: { alignItems: "center", marginTop: 80 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySub: { marginTop: 6, fontSize: 13 },
})