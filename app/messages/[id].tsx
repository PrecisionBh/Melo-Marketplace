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
  View
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

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

/* ---------------- MAIN RETURN (THIS WAS MISSING - CRITICAL FIX) ---------------- */

return (
  <View style={styles.screen}>
    {/* HEADER */}
    <View
      style={[
        styles.topBar,
        { paddingTop: insets.top + 10 },
      ]}
    >
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons
          name="arrow-back"
          size={22}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        {otherUserAvatar ? (
          <Image
            source={{ uri: otherUserAvatar }}
            style={styles.headerAvatar}
          />
        ) : (
          <Image
            source={require("../../assets/images/avatar-placeholder.png")}
            style={styles.headerAvatar}
          />
        )}
        <Text style={styles.title}>{otherUserName}</Text>
      </View>

      <View style={{ width: 22 }} />
    </View>

    {/* CHAT BODY */}
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={
        Platform.OS === "ios" ? "padding" : "height"
      }
      keyboardVerticalOffset={
        Platform.OS === "ios" ? 90 : 20
      }
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({
            animated: true,
          })
        }
      />

              {/* TYPING INDICATOR */}
        {isOtherTyping && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>
                {otherUserName} is typing...
              </Text>
            </View>
          </View>
        )}

        {/* INPUT */}
        <View
          style={[
            styles.inputRow,
            { paddingBottom: insets.bottom + 10 },
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
  </View>
)
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  topBar: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#7FAF9B",
    borderBottomWidth: 1,
    borderBottomColor: "#6E9E8C",
  },

  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },

  title: {
  fontSize: 18, // match AppHeader
  fontWeight: "800",
  color: "#FFFFFF",
},


 list: {
  paddingTop: 12,
  paddingHorizontal: 12,
  paddingBottom: 8, // 🔥 SMALL padding only (NOT 140)
  flexGrow: 1, // 🧠 CRITICAL: makes messages stick to bottom properly
  justifyContent: "flex-end", // 🚀 anchors last message above input
},

  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#D6E6DE",
  },

  productImage: {
    width: 54,
    height: 54,
    borderRadius: 8,
  },

  productInfo: {
    marginLeft: 10,
    justifyContent: "center",
  },

  productTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F1E17",
  },

  productPrice: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "800",
    color: "#2E5F4F",
  },

  offerBtn: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#EAF4EF",
    alignSelf: "flex-start",
  },

  offerText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F1E17",
  },

  bubble: {
    maxWidth: "80%",
    padding: 10,
    borderRadius: 14,
    marginBottom: 10,
  },

  myBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#0F1E17",
  },

  theirBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#D6E6DE",
  },

  bubbleText: {
    fontSize: 14,
    color: "#0F1E17",
  },

  myBubbleText: {
    color: "#fff",
  },

  meta: {
    marginTop: 4,
    fontSize: 10,
    color: "#CFE5DA",
    textAlign: "right",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#D6E6DE",
    backgroundColor: "#EAF4EF",
  },

  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 18,
    fontSize: 14,
  },

  sendBtn: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0F1E17",
    alignItems: "center",
    justifyContent: "center",
  },

  dateHeaderContainer: {
    alignItems: "center",
    marginVertical: 12,
  },

  dateHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6E9E8C",
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
    color: "#6E9E8C",
    fontWeight: "600",
  },

    /* ---------------- TYPING INDICATOR ---------------- */

  typingContainer: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },

  typingBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#D6E6DE", // matches your chat theme
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    maxWidth: "70%",
  },

  typingText: {
    fontSize: 12,
    color: "#2E5F4F",
    fontStyle: "italic",
    fontWeight: "500",
  },

})
