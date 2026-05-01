import { Ionicons } from "@expo/vector-icons"
import * as ImageManipulator from "expo-image-manipulator"
import * as ImagePicker from "expo-image-picker"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator, Alert,
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

import GlobalHeader from "@/components/global/globalheader"
import { containsBlockedContent, getBlockedReason } from "@/lib/contentFilter"
import { useAuth } from "../../context/AuthContext"
import { handleAppError } from "../../lib/errors/appError"
import { supabase } from "../../lib/supabase"

type Message = {
  id: string
  body: string | null
  image_url?: string | null
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

  const params = useLocalSearchParams<{ id?: string; listingId?: string }>()

  const conversationId =
    typeof params.id === "string" ? params.id : null

  const listingId =
    typeof params.listingId === "string" ? params.listingId : null

  const { session } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [listingMap, setListingMap] =
    useState<Record<string, ListingPreview>>({})
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)

  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const messageChannelRef = useRef<any>(null)
  const typingChannelRef = useRef<any>(null)

  const [initialListingId, setInitialListingId] = useState<string | null>(null)

  const [otherUserName, setOtherUserName] = useState("Chat")
  const [otherUserAvatar, setOtherUserAvatar] = useState<string | null>(null)
  const [otherUserId, setOtherUserId] = useState<string | null>(null)

  const flatListRef = useRef<FlatList>(null)

  /* 🔥 ID GUARD + LOADING SPINNER (CORRECT PLACEMENT) */
  const isInvalidId =
    !conversationId || conversationId.includes("[id]")

  if (isInvalidId) {
  console.log("❌ INVALID ID:", params)
  return <ActivityIndicator size="large" />
}

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
  if (!conversationId || conversationId.includes("[id]")) return

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
      if (!conversationId || conversationId.includes("[id]")) return

      const { data, error } = await supabase
  .from("messages")
  .select("id, body, image_url, sender_id, created_at, read_at, listing_id")
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
      if (!conversationId || conversationId.includes("[id]") || !session?.user) return

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
      if (!conversationId || conversationId.includes("[id]") || !session?.user) return

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

  if (!conversationId || conversationId.includes("[id]")) {
    console.log("❌ No conversationId — abort subscribe")
    return () => {}
  }

  // 🔥 PREVENT DOUBLE SUBSCRIBE CRASH
if (messageChannelRef.current) {
  console.log("⚠️ Channel already exists — skipping subscribe")
  return () => {}
}

  if (typingChannelRef.current) {
    console.log("🧹 Removing existing typing channel")
    supabase.removeChannel(typingChannelRef.current)
    typingChannelRef.current = null
  }

  const messagesChannel = supabase
  .channel(`messages-${conversationId}`)

  // 🔥 INSERT (new messages)
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
        // Remove matching temp message once the real DB message arrives
        const withoutTemp = prev.filter((m) => {
          const isMatchingTemp =
            m.id.startsWith("temp") &&
            m.sender_id === newMessage.sender_id &&
            (m.body ?? "") === (newMessage.body ?? "") &&
            (m.image_url ?? "") === (newMessage.image_url ?? "")

          return !isMatchingTemp
        })

        // Prevent duplicate real messages
        const alreadyExists = withoutTemp.some(
          (m) => m.id === newMessage.id
        )

        if (alreadyExists) return withoutTemp

        return [...withoutTemp, newMessage]
      })

      console.log("👁 Marking as read after realtime")
      markAsRead()

      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      })
    }
  )

  // 🔥 UPDATE (seen / read receipts)
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "messages",
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      const updated = payload.new as Message

      setMessages((prev) =>
        prev.map((m) =>
          m.id === updated.id
            ? { ...m, read_at: updated.read_at }
            : m
        )
      )
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

      // 🔥 smooth typing indicator (no flicker)
setIsOtherTyping(true)

if (typingTimeoutRef.current) {
  clearTimeout(typingTimeoutRef.current)
}

// 👇 longer + smoother timeout
typingTimeoutRef.current = setTimeout(() => {
  setIsOtherTyping(false)
}, 3000)
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

  if (sending) return
  if (!text.trim()) return
  if (!session?.user) return
  if (!conversationId || conversationId.includes("[id]")) return

  setSending(true)

  const message = text.trim()
  if (containsBlockedContent(message)) {
  Alert.alert(
    "Message Blocked",
    getBlockedReason(message) || "This message is not allowed on Melo."
  )
  setSending(false)
  return
}

  const messageListingId =
    messages.length === 0 && initialListingId
      ? initialListingId
      : null

  const tempId = `temp-${Date.now()}`

  const tempMessage: Message = {
    id: tempId,
    body: message,
    image_url: null,
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
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        body: message,
        image_url: null,
        listing_id: messageListingId,
      })
      .select()

    if (error) throw error
    console.log("📦 INSERT RESULT:", data)

if (!data?.length) {
  console.log("❌ No message returned, stopping notification")
  return
}

const realMessageId = data[0].id

// 🔥 GET RECIPIENT + SEND NOTIFICATION
const { data: convo } = await supabase
  .from("conversations")
  .select("user_one, user_two")
  .eq("id", conversationId)
  .single()

if (!convo) return

const recipientId =
  convo.user_one === session.user.id
    ? convo.user_two
    : convo.user_one

if (!recipientId) return

await supabase.functions.invoke("send-notification", {
  body: {
    userId: recipientId,
    type: "message",
    title: "New message",
    body: message,
    data: {
      route: `/messages/${conversationId}`, // fallback route
      conversationId, // 🔥 REQUIRED for proper routing
      listingId: messageListingId ?? null, // 🔥 ADD THIS (important)
      type: "message",
    },
    dedupeKey: realMessageId,
  },
})

const realMessage = data[0]

// 🔥 REPLACE TEMP MESSAGE WITH REAL MESSAGE
setMessages((prev) =>
  prev.map((m) =>
    m.id === tempId ? realMessage : m
  )
)

  } catch (err) {
    handleAppError(err, {
      fallbackMessage: "Message failed to send.",
    })
  } finally {
    setSending(false)
  }
}

const broadcastTyping = async () => {
  if (!conversationId || conversationId.includes("[id]") || !session?.user) return
  if (!typingChannelRef.current) return

  await typingChannelRef.current.send({
    type: "broadcast",
    event: "typing",
    payload: {
      userId: session.user.id,
    },
  })
}

const uploadChatImage = async (localUri: string) => {
  if (!session?.user) throw new Error("No session user")
if (!conversationId || conversationId.includes("[id]")) {
  throw new Error("Invalid conversationId")
}

  const response = await fetch(localUri)
  const arrayBuffer = await response.arrayBuffer()

  const fileExtMatch = localUri.match(/\.(\w+)$/)
  const fileExt = fileExtMatch ? fileExtMatch[1].toLowerCase() : "jpg"

  const normalizedExt =
    fileExt === "jpg" || fileExt === "jpeg"
      ? "jpeg"
      : fileExt === "png"
      ? "png"
      : "jpeg"

  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}.${normalizedExt}`

  const filePath = `${conversationId}/${session.user.id}/${fileName}`

  const { data, error } = await supabase.storage
    .from("chat-images")
    .upload(filePath, arrayBuffer, {
      contentType: `image/${normalizedExt}`,
      upsert: false,
    })

  if (error) throw error

  return data.path
}

const sendImageMessage = async (localUri: string) => {
  if (sending || uploadingImage) return
  if (!session?.user) return
  if (!conversationId || conversationId.includes("[id]")) return

  // 🔥 NEW: warning before sending image
  Alert.alert(
    "Reminder",
    "Do not share payment info, links, phone numbers, or emails in images. You may lose protection."
  )

  setUploadingImage(true)

  const messageListingId =
    messages.length === 0 && initialListingId
      ? initialListingId
      : null

  const tempId = `temp-image-${Date.now()}`

  const tempMessage: Message = {
    id: tempId,
    body: "",
    image_url: localUri,
    sender_id: session.user.id,
    created_at: new Date().toISOString(),
    read_at: null,
    listing_id: messageListingId,
  }

  setMessages((prev) => [...prev, tempMessage])

  setTimeout(() => {
    flatListRef.current?.scrollToEnd({ animated: true })
  }, 50)

  try {
    const filePath = await uploadChatImage(localUri)

    const payload = {
      conversation_id: conversationId,
      sender_id: session.user.id,
      body: "",
      image_url: filePath,
      listing_id: messageListingId,
    }

    console.log("📤 IMAGE MESSAGE PAYLOAD:", payload)

    const { data, error } = await supabase
      .from("messages")
      .insert(payload)
      .select()

    if (error) throw error
    if (!data?.length) {
      throw new Error("No message returned after image send.")
    }

    const realMessageId = data[0].id

    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId
          ? data[0]
          : m
      )
    )

    const { data: convo } = await supabase
      .from("conversations")
      .select("user_one, user_two")
      .eq("id", conversationId)
      .single()

    if (!convo) {
      throw new Error("Conversation not found")
    }

    const recipientId =
      convo.user_one === session.user.id
        ? convo.user_two
        : convo.user_one

    if (recipientId) {
      await supabase.functions.invoke("send-notification", {
  body: {
    userId: recipientId,
    type: "message",
    title: "New image",
    body: "Sent you a photo",
    data: {
      route: `/messages/${conversationId}`, // fallback
      conversationId, // 🔥 REQUIRED (fixes spinner)
      listingId: messageListingId ?? null, // 🔥 ADD THIS
      type: "message",
    },
    dedupeKey: realMessageId,
  },
})
    }
  } catch (err) {
    handleAppError(err, {
      fallbackMessage: "Image failed to send.",
    })
  } finally {
    setUploadingImage(false)
  }
}

const pickChatImage = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.35,
      allowsMultipleSelection: false,
      selectionLimit: 1,
    })

    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0]

      const converted = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1200 } }],
        {
          compress: 0.25,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      )

      await sendImageMessage(converted.uri)
    }
  } catch (err) {
    handleAppError(err, {
      context: "chat_image_picker",
      fallbackMessage: "Could not select image.",
    })
  }
}

const takeChatPhoto = async () => {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync()

    if (!permission.granted) {
      Alert.alert("Permission required", "Enable camera access.")
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.35,
    })

    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0]

      const converted = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1200 } }],
        {
          compress: 0.25,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      )

      await sendImageMessage(converted.uri)
    }
  } catch (err) {
    handleAppError(err, {
      context: "chat_image_camera",
      fallbackMessage: "Could not take photo.",
    })
  }
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
  const isSameSenderAsPrev =
  prevMessage &&
  prevMessage.sender_id === item.sender_id &&
  new Date(prevMessage.created_at).toDateString() ===
    new Date(item.created_at).toDateString()

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
    item.image_url
      ? styles.imageBubble
      : isMe
      ? styles.myBubble
      : styles.theirBubble,
  ]}
>
  {item.image_url ? (
    <Image
      source={{
        uri: item.image_url.startsWith("http")
          ? item.image_url
          : supabase.storage
              .from("chat-images")
              .getPublicUrl(item.image_url).data.publicUrl,
      }}
      style={styles.chatImage}
    />
  ) : (
    <Text
      style={[
        styles.bubbleText,
        isMe && styles.myBubbleText,
      ]}
    >
      {item.body}
    </Text>
  )}

  {isMe && index === messages.length - 1 && (
  <Text style={styles.meta}>
    {item.read_at ? "Seen" : "Delivered"}
  </Text>
)}
</View>
    </View>
  )
}

return (
  <KeyboardAvoidingView
    style={styles.screen}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={0}
  >
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

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.listFlex}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {isOtherTyping && (
        <View style={styles.typingWrap}>
          <View style={styles.typingBubble}>
            <Text style={styles.typingText}>
              {otherUserName} is typing...
            </Text>
          </View>
        </View>
      )}

      <View style={styles.inputRow}>
  <TouchableOpacity
    onPress={takeChatPhoto}
    style={styles.iconBtn}
    disabled={uploadingImage}
  >
    <Ionicons name="camera-outline" size={22} color="#111" />
  </TouchableOpacity>

  <TouchableOpacity
    onPress={pickChatImage}
    style={styles.iconBtn}
    disabled={uploadingImage}
  >
    <Ionicons name="image-outline" size={22} color="#111" />
  </TouchableOpacity>

  <TextInput
    value={text}
    onChangeText={(val) => {
  setText(val)

  if (containsBlockedContent(val)) {
    Alert.alert(
      "Warning",
      "Sharing payment info, links, or contact details is not allowed."
    )
  }

  broadcastTyping()
}}
    placeholder={uploadingImage ? "Uploading image..." : "Message..."}
    style={styles.input}
    multiline
    textAlignVertical="top"
    editable={!uploadingImage}
  />

  <TouchableOpacity
    onPress={sendMessage}
    style={styles.sendBtn}
    disabled={uploadingImage}
  >
    <Ionicons name="send" size={18} color="#fff" />
  </TouchableOpacity>
</View>
    </View>
  </KeyboardAvoidingView>
)

}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

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

  listFlex: {
    flex: 1,
  },

  list: {
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

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

  bubble: {
  maxWidth: "80%",
  padding: 10,
  borderRadius: 14,
  marginBottom: 10,
},

imageBubble: {
  maxWidth: "80%",
  padding: 4,
  borderRadius: 16,
  marginBottom: 1,
  overflow: "hidden",
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#E8E8E8",
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

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 60,
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

  iconBtn: {
  width: 38,
  height: 38,
  borderRadius: 19,
  alignItems: "center",
  justifyContent: "center",
  marginRight: 6,
},

chatImage: {
  width: 220,
  height: 220,
  borderRadius: 12,
  resizeMode: "cover",
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

  typingWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#F8F8F8",
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
})
