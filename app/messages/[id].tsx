import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useRef, useState } from "react"
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"
import { useAuth } from "../../context/AuthContext"
import { handleAppError } from "../../lib/errors/appError"
import { supabase } from "../../lib/supabase"

type Message = {
  id: string
  body: string
  sender_id: string
  created_at: string
  read_at: string | null
  listing_id: string | null
}

type ListingPreview = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  allow_offers: boolean
}

export default function ChatScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const { id: conversationId, listingId } =
    useLocalSearchParams<{ id: string; listingId?: string }>()

  const { session } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [listingMap, setListingMap] =
    useState<Record<string, ListingPreview>>({})
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const messageChannelRef = useRef<any>(null)
  const typingChannelRef = useRef<any>(null)

  const [initialListingId, setInitialListingId] = useState<string | null>(null)

  const [otherUserName, setOtherUserName] = useState("Chat")
  const [otherUserAvatar, setOtherUserAvatar] = useState<string | null>(null)
  const [otherUserId, setOtherUserId] = useState<string | null>(null)

  const flatListRef = useRef<FlatList>(null)

  /* ---------------- CAPTURE LISTING ID ---------------- */

  useEffect(() => {
    if (listingId && typeof listingId === "string") {
      setInitialListingId(listingId)
    }
  }, [listingId])

  /* ---------------- PRELOAD INITIAL LISTING ---------------- */

  useEffect(() => {
    if (!initialListingId) return
    preloadInitialListing()
  }, [initialListingId])

  /* ---------------- INITIAL LOAD + REALTIME ---------------- */

  useEffect(() => {
    if (!conversationId) return

    loadMessages()
    loadConversationUser()
    markAsRead()

    const unsubscribe = subscribeToMessages()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [conversationId])

  /* ---------------- PRELOAD INITIAL LISTING CARD ---------------- */

  const preloadInitialListing = async () => {
    try {
      if (!initialListingId) return

      if (listingMap[initialListingId]) return

      const { data, error } = await supabase
        .from("listings")
        .select("id,title,price,image_urls,allow_offers")
        .eq("id", initialListingId)
        .single()

      if (error || !data) {
        throw error ?? new Error("Listing preload failed")
      }

      setListingMap((prev) => ({
        ...prev,
        [data.id]: data,
      }))
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load product preview.",
      })
    }
  }

  /* ---------------- LOAD MESSAGES ---------------- */

  const loadMessages = async () => {
    try {
      if (!conversationId) return

      const { data, error } = await supabase
        .from("messages")
        .select("id, body, sender_id, created_at, read_at, listing_id")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (error) throw error

      if (data) {
        setMessages(data)
        await loadListingCards(data)
      }
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load messages.",
      })
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- LOAD CONVERSATION USER ---------------- */

  const loadConversationUser = async () => {
    try {
      if (!conversationId || !session?.user) return

      const { data, error } = await supabase
        .from("conversations")
        .select("user_one, user_two")
        .eq("id", conversationId)
        .single()

      if (error || !data) {
        throw error ?? new Error("Conversation not found")
      }

      const resolvedOtherUserId =
        data.user_one === session.user.id
          ? data.user_two
          : data.user_one

      setOtherUserId(resolvedOtherUserId)

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", resolvedOtherUserId)
        .single()

      if (profileError) throw profileError

      if (profile?.display_name) {
        setOtherUserName(profile.display_name)
      }

      if (profile?.avatar_url) {
        setOtherUserAvatar(profile.avatar_url)
      }
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load chat user.",
      })
    }
  }

  /* ---------------- LOAD PRODUCT CARDS ---------------- */

  const loadListingCards = async (msgs: Message[]) => {
    try {
      const listingIds = Array.from(
        new Set(msgs.map((m) => m.listing_id).filter(Boolean))
      ) as string[]

      if (listingIds.length === 0) return

      const { data, error } = await supabase
        .from("listings")
        .select("id,title,price,image_urls,allow_offers")
        .in("id", listingIds)

      if (error) throw error
      if (!data) return

      const map: Record<string, ListingPreview> = {}
      data.forEach((l) => {
        map[l.id] = l
      })

      setListingMap(map)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load listing cards.",
      })
    }
  }

  /* ---------------- MARK READ ---------------- */

  const markAsRead = async () => {
    try {
      if (!conversationId || !session?.user) return

      const { error } = await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_id", session.user.id)
        .is("read_at", null)

      if (error) throw error
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to update read status.",
      })
    }
  }

 /* ---------------- REALTIME ---------------- */

const subscribeToMessages = () => {
  console.log("🟢 subscribeToMessages INIT", conversationId)

  if (!conversationId) {
    console.log("❌ No conversationId — abort subscribe")
    return () => {}
  }

  if (messageChannelRef.current) {
    console.log("🧹 Removing existing message channel")
    supabase.removeChannel(messageChannelRef.current)
    messageChannelRef.current = null
  }

  if (typingChannelRef.current) {
    console.log("🧹 Removing existing typing channel")
    supabase.removeChannel(typingChannelRef.current)
    typingChannelRef.current = null
  }

  const messagesChannel = supabase
    .channel(`messages-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        console.log("📩 REALTIME MESSAGE RECEIVED:", payload)

        const newMessage = payload.new as Message

        setMessages((prev) => {
          const alreadyExists = prev.some((m) => m.id === newMessage.id)
          if (alreadyExists) {
            console.log("⚠️ Duplicate realtime message blocked")
            return prev
          }
          return [...prev, newMessage]
        })

        console.log("👁 Marking as read after realtime")
        markAsRead()

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true })
        }, 50)
      }
    )
    .subscribe((status) => {
      console.log("📡 Message channel status:", status)
    })

  messageChannelRef.current = messagesChannel

  const typingChannel = supabase
    .channel(`typing-${conversationId}`)
    .on("broadcast", { event: "typing" }, (payload) => {
      console.log("⌨️ Typing event:", payload)

      if (payload.payload?.userId === session?.user?.id) return

      setIsOtherTyping(true)

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsOtherTyping(false)
      }, 2000)
    })
    .subscribe((status) => {
      console.log("📡 Typing channel status:", status)
    })

  typingChannelRef.current = typingChannel

  return () => {
    console.log("🧹 Cleaning up channels")

    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current)
      messageChannelRef.current = null
    }

    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current)
      typingChannelRef.current = null
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }
}

/* ---------------- SEND ---------------- */

const sendMessage = async () => {
  console.log("🚀 sendMessage CALLED")
  console.log("🚀 sendMessage TRIGGERED")

  if (sending) {
    console.log("⛔ blocked — already sending")
    return
  }

  if (!text.trim()) {
    console.log("⛔ blocked — empty text")
    return
  }

  if (!session?.user) {
    console.log("⛔ blocked — no session")
    return
  }

  if (!conversationId) {
    console.log("⛔ blocked — no conversationId")
    return
  }

  setSending(true)

  const message = text.trim()
  console.log("✉️ Sending message:", message)

  const messageListingId =
    messages.length === 0 && initialListingId
      ? initialListingId
      : null

  console.log("📦 listing attached:", messageListingId)

  const tempId = `temp-${Date.now()}`

  const tempMessage: Message = {
    id: tempId,
    body: message,
    sender_id: session.user.id,
    created_at: new Date().toISOString(),
    read_at: null,
    listing_id: messageListingId,
  }

  setMessages((prev) => [...prev, tempMessage])

  setTimeout(() => {
    flatListRef.current?.scrollToEnd({ animated: true })
  }, 50)

  setIsOtherTyping(false)

  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = null
  }

  setText("")

  try {
    console.log("📤 INSERTING MESSAGE INTO DB")

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        body: message,
        listing_id: messageListingId,
      })
      .select()

    console.log("🔥 INSERT RESULT:", data, error)

    if (error) {
      console.log("❌ INSERT ERROR:", error)
      throw error
    }

    if (!data || data.length === 0) {
      console.log("❌ NO DATA RETURNED FROM INSERT")
      return
    }

    const realMessageId = data[0].id
    console.log("✅ Message inserted with ID:", realMessageId)

    /* ---------------- NOTIFICATION ---------------- */

    console.log("🔍 Fetching conversation for notification")

    const { data: convo, error: convoError } = await supabase
      .from("conversations")
      .select("user_one, user_two")
      .eq("id", conversationId)
      .single()

    console.log("📦 convo result:", convo, convoError)

    if (convoError || !convo) {
      console.log("❌ convo fetch failed:", convoError)
      return
    }

    const recipientId =
      convo.user_one === session.user.id
        ? convo.user_two
        : convo.user_one

    console.log("🎯 recipientId:", recipientId)

    if (!recipientId) {
      console.log("❌ no recipientId — abort")
      return
    }

    console.log("📡 INVOKING FUNCTION send-notification")

    const res = await supabase.functions.invoke("send-notification", {
      body: {
        userId: recipientId,
        type: "message",
        title: "New message",
        body: message,
        data: {
          route: "/messages/[id]",
          params: { id: conversationId },
        },
        dedupeKey: realMessageId,
      },
    })

    console.log("🔥 FUNCTION RESPONSE:", res)
  } catch (err) {
    console.log("💥 SEND MESSAGE ERROR:", err)

    handleAppError(err, {
      fallbackMessage: "Message failed to send.",
    })
  } finally {
    console.log("🔓 sendMessage FINISHED")
    setSending(false)
  }
}

const broadcastTyping = async () => {
  if (!conversationId || !session?.user) return
  if (!typingChannelRef.current) return

  await typingChannelRef.current.send({
    type: "broadcast",
    event: "typing",
    payload: {
      userId: session.user.id,
    },
  })
}

/* ---------------- HELPERS ---------------- */

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })

const formatDateHeader = (date: string) => {
  const d = new Date(date)
  const today = new Date()

  const isToday =
    d.toDateString() === today.toDateString()

  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const isYesterday =
    d.toDateString() === yesterday.toDateString()

  if (isToday) return "Today"
  if (isYesterday) return "Yesterday"

  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

/* ---------------- RENDER ITEM ---------------- */

const renderItem = ({
  item,
  index,
}: {
  item: Message
  index: number
}) => {
  const isMe = item.sender_id === session?.user?.id

  const prevMessage = messages[index - 1]

  const showDateHeader =
    !prevMessage ||
    new Date(prevMessage.created_at).toDateString() !==
      new Date(item.created_at).toDateString()

  const showProductCard =
    item.listing_id &&
    !messages
      .slice(0, index)
      .some((m) => m.listing_id === item.listing_id)

  return (
    <View>
      {/* DATE HEADER (only once per day) */}
      {showDateHeader && (
        <View style={styles.dateHeaderContainer}>
          <Text style={styles.dateHeader}>
            {formatDateHeader(item.created_at)}
          </Text>
        </View>
      )}

      {showProductCard &&
        item.listing_id &&
        listingMap[item.listing_id] && (
          <TouchableOpacity
            style={styles.productCard}
            onPress={() =>
              router.push(`/listing/${item.listing_id}`)
            }
          >
            <Image
              source={{
                uri:
                  listingMap[item.listing_id].image_urls?.[0],
              }}
              style={styles.productImage}
            />

            <View style={styles.productInfo}>
              <Text style={styles.productTitle}>
                {listingMap[item.listing_id].title}
              </Text>

              <Text style={styles.productPrice}>
                $
                {listingMap[item.listing_id].price.toFixed(2)}
              </Text>

              {listingMap[item.listing_id]
                .allow_offers && (
                <TouchableOpacity
                  style={styles.offerBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/make-offer",
                      params: {
                        listingId: item.listing_id,
                      },
                    })
                  }
                >
                  <Text style={styles.offerText}>
                    Make Offer
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}

      {/* SMALL TIME ABOVE MESSAGE */}
      <View
        style={[
          styles.timeContainer,
          isMe ? styles.timeRight : styles.timeLeft,
        ]}
      >
        <Text style={styles.timeText}>
          {formatTime(item.created_at)}
        </Text>
      </View>

      {/* MESSAGE BUBBLE */}
      <View
        style={[
          styles.bubble,
          isMe ? styles.myBubble : styles.theirBubble,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isMe && styles.myBubbleText,
          ]}
        >
          {item.body}
        </Text>

        {isMe && (
          <Text style={styles.meta}>
            {item.read_at ? "Seen" : "Sent"}
          </Text>
        )}
      </View>
    </View>
  )
}

return (
  <View style={styles.screen}>
    <GlobalHeader />

    <View style={styles.chatHeaderRow}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={20} color="#111" />
      </TouchableOpacity>

      {otherUserAvatar ? (
        <Image
          source={{ uri: otherUserAvatar }}
          style={styles.chatAvatar}
        />
      ) : (
        <Image
          source={require("../../assets/images/avatar-placeholder.png")}
          style={styles.chatAvatar}
        />
      )}

      <View style={{ flex: 1 }}>
        <Text style={styles.chatName}>{otherUserName}</Text>
        <Text style={styles.chatSub}>
          {initialListingId ? "Re: Listing" : "Conversation"}
        </Text>
      </View>
    </View>

    {/* CHAT LIST */}
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() =>
        flatListRef.current?.scrollToEnd({ animated: true })
      }
    />

    {/* TYPING */}
    {isOtherTyping && (
      <View style={styles.typingFloating}>
        <View style={styles.typingBubble}>
          <Text style={styles.typingText}>
            {otherUserName} is typing...
          </Text>
        </View>
      </View>
    )}

    {/* INPUT */}
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.inputRow,
          {
            bottom: insets.bottom + 70,
          },
        ]}
      >
        <TextInput
          value={text}
          onChangeText={(val) => {
            setText(val)
            broadcastTyping()
          }}
          placeholder="Message..."
          style={styles.input}
          multiline
        />

        <TouchableOpacity
          onPress={sendMessage}
          style={styles.sendBtn}
        >
          <Ionicons
            name="send"
            size={18}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>

    {/* FOOTER */}
    <View style={styles.footerWrap}>
      <GlobalFooter />
    </View>
  </View>
)
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  /* ---------------- CHAT SUB HEADER ---------------- */

  chatHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#F8F8F8",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },

  backBtn: {
    marginRight: 14,
  },

  chatAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },

  chatName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  chatSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  /* ---------------- MESSAGE LIST ---------------- */

  list: {
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 140,
  },

  /* ---------------- PRODUCT CARD ---------------- */

  productCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  productImage: {
    width: 54,
    height: 54,
    borderRadius: 10,
  },

  productInfo: {
    marginLeft: 10,
    justifyContent: "center",
  },

  productTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },

  productPrice: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "800",
    color: "#D97732",
  },

  offerBtn: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    alignSelf: "flex-start",
  },

  offerText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#D97732",
  },

  /* ---------------- MESSAGE BUBBLES ---------------- */

  bubble: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 14,
    marginBottom: 10,
  },

  myBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#D97732",
  },

  theirBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  bubbleText: {
    fontSize: 14,
    color: "#111",
  },

  myBubbleText: {
    color: "#FFF",
  },

  meta: {
    marginTop: 4,
    fontSize: 10,
    color: "#FDE7D4",
    textAlign: "right",
  },

  /* ---------------- INPUT ---------------- */

  inputRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    backgroundColor: "#F8F8F8",
  },

  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  sendBtn: {
    marginLeft: 8,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#D97732",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ---------------- DATE / TIME ---------------- */

  dateHeaderContainer: {
    alignItems: "center",
    marginVertical: 12,
  },

  dateHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
  },

  timeContainer: {
    marginBottom: 4,
  },

  timeLeft: {
    alignItems: "flex-start",
    marginLeft: 8,
  },

  timeRight: {
    alignItems: "flex-end",
    marginRight: 8,
  },

  timeText: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "600",
  },

  /* ---------------- TYPING ---------------- */

  typingFloating: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 130,
  },

  typingBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    maxWidth: "70%",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  typingText: {
    fontSize: 12,
    color: "#777",
    fontStyle: "italic",
    fontWeight: "500",
  },

  /* ---------------- FOOTER ---------------- */

  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
})
