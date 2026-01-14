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

  const { id: conversationId } =
    useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [listingMap, setListingMap] =
    useState<Record<string, ListingPreview>>({})
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)

  const [otherUserName, setOtherUserName] = useState("Chat")
  const [otherUserAvatar, setOtherUserAvatar] =
    useState<string | null>(null)

  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    loadMessages()
    loadConversationUser()
    subscribeToMessages()
    markAsRead()

    return () => {
      supabase.removeAllChannels()
    }
  }, [conversationId])

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
    if (!conversationId) return

    supabase
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
          setMessages((prev) => [
            ...prev,
            payload.new as Message,
          ])
          markAsRead()
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({
              animated: true,
            })
          }, 50)
        }
      )
      .subscribe()
  }

  /* ---------------- SEND ---------------- */

  const sendMessage = async () => {
    if (!text.trim() || !session?.user) return

    const body = text.trim()
    setText("")

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: session.user.id,
      body,
    })
  }

  /* ---------------- HELPERS ---------------- */

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })

  /* ---------------- RENDER ITEM ---------------- */

  const renderItem = ({
    item,
    index,
  }: {
    item: Message
    index: number
  }) => {
    const isMe = item.sender_id === session?.user?.id

    const showProductCard =
      item.listing_id &&
      !messages
        .slice(0, index)
        .some((m) => m.listing_id === item.listing_id)

    return (
      <View>
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
                  {listingMap[item.listing_id].price.toFixed(
                    2
                  )}
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
              {formatTime(item.created_at)} •{" "}
              {item.read_at ? "Seen" : "Unread"}
            </Text>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={22}
            color="#0F1E17"
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

        {/* INPUT */}
        <View
          style={[
            styles.inputRow,
            { paddingBottom: insets.bottom + 10 },
          ]}
        >
          <TextInput
            value={text}
            onChangeText={setText}
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
    paddingTop: 50,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F1E17",
  },

  list: {
    padding: 16,
    paddingBottom: 140,
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
})
