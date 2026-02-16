import { notify } from "@/lib/notifications/notify"
import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useRef, useState } from "react"
import {
  Alert,
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

import { useAuth } from "../../context/AuthContext"
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

  // 🔥 UPDATED: now supports listingId from Listing screen
  const { id: conversationId, listingId } =
    useLocalSearchParams<{ id: string; listingId?: string }>()

  const { session } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [listingMap, setListingMap] =
    useState<Record<string, ListingPreview>>({})
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)

  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingChannelRef = useRef<any>(null)

  // 🟢 NEW: holds the listing attached to this chat session
  const [initialListingId, setInitialListingId] = useState<string | null>(null)

  const [otherUserName, setOtherUserName] = useState("Chat")
  const [otherUserAvatar, setOtherUserAvatar] = useState<string | null>(null)
  const [otherUserId, setOtherUserId] = useState<string | null>(null)

  const flatListRef = useRef<FlatList>(null)

  /* 🟢 Capture listingId when chat is opened from a listing */
  useEffect(() => {
    if (listingId && typeof listingId === "string") {
      setInitialListingId(listingId)
    }
  }, [listingId])

  /* 🟢 PRELOAD product card EVEN before first message */
  useEffect(() => {
    if (!initialListingId) return
    preloadInitialListing()
  }, [initialListingId])

  useEffect(() => {
    if (!conversationId) return

    loadMessages()
    loadConversationUser()
    markAsRead()

    // Subscribe to realtime (messages + typing)
    const unsubscribe = subscribeToMessages()

    // Cleanup ONLY this chat's channels
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [conversationId])

  /* 🟢 PRELOAD INITIAL LISTING CARD (CRITICAL FOR CARD BEFORE FIRST MESSAGE) */
  const preloadInitialListing = async () => {
    if (!initialListingId) return

    // If already cached, skip
    if (listingMap[initialListingId]) return

    const { data } = await supabase
      .from("listings")
      .select("id,title,price,image_urls,allow_offers")
      .eq("id", initialListingId)
      .single()

    if (!data) return

    setListingMap((prev) => ({
      ...prev,
      [data.id]: data,
    }))
  }

  /* ---------------- LOAD MESSAGES ---------------- */

  const loadMessages = async () => {
    if (!conversationId) return

    const { data, error } = await supabase
      .from("messages")
      .select(
        "id, body, sender_id, created_at, read_at, listing_id"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (!error && data) {
      setMessages(data)
      loadListingCards(data)
    }

    setLoading(false)
  }

  /* ---------------- LOAD CONVERSATION USER ---------------- */

  const loadConversationUser = async () => {
    if (!conversationId || !session?.user) return

    const { data } = await supabase
      .from("conversations")
      .select("user_one, user_two")
      .eq("id", conversationId)
      .single()

    if (!data) return

    const otherUserId =
      data.user_one === session.user.id
        ? data.user_two
        : data.user_one

    setOtherUserId(otherUserId)

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", otherUserId)
      .single()

    if (profile?.display_name)
      setOtherUserName(profile.display_name)

    if (profile?.avatar_url)
      setOtherUserAvatar(profile.avatar_url)
  }

  /* ---------------- LOAD PRODUCT CARDS ---------------- */

  const loadListingCards = async (msgs: Message[]) => {
    const listingIds = Array.from(
      new Set(msgs.map((m) => m.listing_id).filter(Boolean))
    ) as string[]

    if (listingIds.length === 0) return

    const { data } = await supabase
      .from("listings")
      .select("id,title,price,image_urls,allow_offers")
      .in("id", listingIds)

    if (!data) return

    const map: Record<string, ListingPreview> = {}
    data.forEach((l) => {
      map[l.id] = l
    })

    setListingMap(map)
  }

  /* ---------------- MARK READ ---------------- */

  const markAsRead = async () => {
    if (!conversationId || !session?.user) return

    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", session.user.id)
      .is("read_at", null)
  }


/* ---------------- REALTIME ---------------- */

const subscribeToMessages = () => {
  if (!conversationId) return () => {}

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
        const newMessage = payload.new as Message

        setMessages((prev) => {
          const alreadyExists = prev.some(
            (m) =>
              m.id === newMessage.id ||
              (m.body === newMessage.body &&
                m.sender_id === newMessage.sender_id &&
                Math.abs(
                  new Date(m.created_at).getTime() -
                    new Date(newMessage.created_at).getTime()
                ) < 5000)
          )

          if (alreadyExists) return prev
          return [...prev, newMessage]
        })

        markAsRead()

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true })
        }, 50)
      }
    )
    .subscribe()

  const typingChannel = supabase
    .channel(`typing-${conversationId}`)
    .on("broadcast", { event: "typing" }, (payload) => {
      if (payload.payload?.userId === session?.user?.id) return

      setIsOtherTyping(true)

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsOtherTyping(false)
      }, 2000)
    })
    .subscribe()

  typingChannelRef.current = typingChannel

  return () => {
    supabase.removeChannel(messagesChannel)
    supabase.removeChannel(typingChannel)

    typingChannelRef.current = null

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }
}

  /* ---------------- SEND ---------------- */

  const sendMessage = async () => {
  if (!text.trim() || !session?.user || !conversationId) return

  const message = text.trim()
  const lowerMessage = message.toLowerCase()

  // 🚫 Block emails
  const emailRegex = /\S+@\S+\.\S+/

  // 🚫 Block phone numbers
  const phoneRegex = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/

  // 🚫 Block off-platform payments & contact attempts
  const bannedKeywords = [
    "zelle",
    "venmo",
    "cashapp",
    "paypal",
    "apple pay",
    "google pay",
    "text me",
    "call me",
    "email me",
    "hit me up",
    "send your number",
    "whatsapp",
    "telegram",
    "pay outside",
    "outside the app",
    "pay off app",
  ]

  const containsBannedKeyword = bannedKeywords.some((word) =>
    lowerMessage.includes(word)
  )

  if (
    emailRegex.test(message) ||
    phoneRegex.test(message) ||
    containsBannedKeyword
  ) {
    Alert.alert(
      "Safety Notice",
      "Keeping all communication through Melo is the only way we can ensure full buyer and seller protection. Sharing contact information or discussing off-platform payments is not allowed."
    )
    return
  }

  // 🟢 CRITICAL: Attach listing ONLY to the first message (if chat came from listing)
  const messageListingId =
    messages.length === 0 && initialListingId
      ? initialListingId
      : null

  // 🔥 OPTIMISTIC MESSAGE (INSTANT UI)
  const tempMessage: Message = {
    id: `temp-${Date.now()}`,
    body: message,
    sender_id: session.user.id,
    created_at: new Date().toISOString(),
    read_at: null,
    listing_id: messageListingId, // 🟢 THIS makes the product card appear
  }

  // Instantly show message in UI
  setMessages((prev) => [...prev, tempMessage])

  // Auto scroll
  setTimeout(() => {
    flatListRef.current?.scrollToEnd({ animated: true })
  }, 50)

  // Stop typing indicator immediately
  setIsOtherTyping(false)

  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = null
  }

  // Clear input instantly
  setText("")

  // 🚀 Send to Supabase (REAL MESSAGE)
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: session.user.id,
    body: message,
    listing_id: messageListingId, // 🟢 REAL DB card attachment
  })

  if (error) {
    console.error("Send message error:", error)
  }

  // 🔔 Notify other user
  if (otherUserId) {
    await notify({
      userId: otherUserId,
      type: "message",
      title: "New message",
      body: "You have a new message",
      data: {
        route: "/messages/[id]",
        params: { id: conversationId },
      },
    })
  }
}

const broadcastTyping = async () => {
  if (!conversationId || !session?.user) return

  // Reuse the existing typing channel (prevents channel spam)
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
