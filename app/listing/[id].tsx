import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

import { useAuth } from "../../context/AuthContext"
import { supabase } from "../../lib/supabase"

const SCREEN_WIDTH = Dimensions.get("window").width

type Listing = {
  id: string
  user_id: string
  title: string
  description: string | null
  price: number
  brand: string | null
  condition: string
  category: string
  image_urls: string[] | null
  allow_offers: boolean
  shipping_type: "free" | "buyer_pays"
  shipping_price: number | null
}

export default function ListingDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)

  const [sellerName, setSellerName] = useState<string | null>(null)

  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)

  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)

  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    if (id) loadListing()
  }, [id])

  useEffect(() => {
    if (listing?.id) loadWatchData()
  }, [listing?.id])

  useEffect(() => {
    if (listing?.user_id) loadSeller()
  }, [listing?.user_id])

  const images = useMemo(() => {
    return Array.isArray(listing?.image_urls)
      ? listing!.image_urls!
      : []
  }, [listing])

  /* ---------------- LOAD LISTING ---------------- */

  const loadListing = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("listings")
      .select(`
        id,
        user_id,
        title,
        description,
        price,
        brand,
        condition,
        category,
        image_urls,
        allow_offers,
        shipping_type,
        shipping_price
      `)
      .eq("id", id)
      .single()

    if (error || !data) {
      console.error("loadListing error:", error)
      setListing(null)
      setLoading(false)
      return
    }

    setListing(data)
    setLoading(false)
  }

  /* ---------------- LOAD SELLER ---------------- */

  const loadSeller = async () => {
    if (!listing?.user_id) return

    const { data, error } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", listing.user_id)
      .single()

    if (error) {
      console.error("loadSeller error:", error)
      setSellerName(null)
      return
    }

    setSellerName(data?.display_name ?? null)
  }

  /* ---------------- MESSAGE SELLER ---------------- */

  const handleMessageSeller = async () => {
  if (!session?.user || !listing) return

  const buyerId = session.user.id
  const sellerId = listing.user_id
  if (buyerId === sellerId) return

  let conversationId: string | null = null

  // 1️⃣ Try buyer → seller
  const { data: direct } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_one", buyerId)
    .eq("user_two", sellerId)
    .order("created_at", { ascending: true })
    .limit(1)

  if (direct && direct.length > 0) {
    conversationId = direct[0].id
  } else {
    // 2️⃣ Try seller → buyer
    const { data: reverse } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_one", sellerId)
      .eq("user_two", buyerId)
      .order("created_at", { ascending: true })
      .limit(1)

    if (reverse && reverse.length > 0) {
      conversationId = reverse[0].id
    }
  }

  // 3️⃣ Create conversation only if none exists
  if (!conversationId) {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({
        user_one: buyerId,
        user_two: sellerId,
      })
      .select("id")
      .single()

    if (error || !created) {
      console.error("conversation create error:", error)
      return
    }

    conversationId = created.id
  }

  // 4️⃣ Insert listing card ONLY if not already in chat
  const { data: existingCard } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("listing_id", listing.id)
    .limit(1)

  if (!existingCard || existingCard.length === 0) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: buyerId,
      listing_id: listing.id,
      body: "Interested in this item",
    })
  }

  // 5️⃣ Open chat
  router.push({
    pathname: "/messages/[id]",
    params: { id: conversationId! },
  })
}


  /* ---------------- WATCHLIST ---------------- */

  const loadWatchData = async () => {
    if (!listing) return

    const { count } = await supabase
      .from("watchlist")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listing.id)

    setLikesCount(count ?? 0)

    if (!session?.user) return

    const { data } = await supabase
      .from("watchlist")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("user_id", session.user.id)
      .maybeSingle()

    setLiked(!!data)
  }

  const toggleWatch = async () => {
    if (!session?.user || !listing) return

    if (liked) {
      await supabase
        .from("watchlist")
        .delete()
        .eq("listing_id", listing.id)
        .eq("user_id", session.user.id)

      setLiked(false)
      setLikesCount((c) => Math.max(0, c - 1))
    } else {
      await supabase.from("watchlist").insert({
        listing_id: listing.id,
        user_id: session.user.id,
      })

      setLiked(true)
      setLikesCount((c) => c + 1)
    }
  }

  /* ---------------- RENDER ---------------- */

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 60 }} />
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Text>Listing not found.</Text>
      </View>
    )
  }

  const isSeller = session?.user?.id === listing.user_id

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Listing</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {/* IMAGE GALLERY */}
        {images.length === 0 ? (
          <View style={styles.imagePage}>
            <Ionicons name="image-outline" size={40} color="#666" />
          </View>
        ) : (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
          >
            {images.map((uri, i) => (
              <TouchableOpacity
                key={i}
                style={styles.imagePage}
                onPress={() => setFullscreenImage(uri)}
                activeOpacity={0.9}
              >
                <Image source={{ uri }} style={styles.image} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* CONTENT */}
        <View style={styles.content}>
          {/* TITLE + HEART */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{listing.title}</Text>

            <View style={{ alignItems: "center" }}>
              <TouchableOpacity onPress={toggleWatch}>
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={26}
                  color={liked ? "#7FAF9B" : "#6B8F7D"}
                />
              </TouchableOpacity>

              {likesCount > 0 && (
                <Text style={styles.likesText}>{likesCount}</Text>
              )}
            </View>
          </View>

          {/* PRICE */}
          <Text style={styles.price}>
            ${listing.price.toFixed(2)}
          </Text>

          <Text style={styles.shipping}>
            {listing.shipping_type === "free"
              ? "Free shipping"
              : `+ $${listing.shipping_price} shipping`}
          </Text>

          {/* ACTIONS */}
          <View style={styles.actions}>
            {listing.allow_offers && (
              <TouchableOpacity
                style={styles.offerBtn}
                onPress={() =>
                  router.push({
                    pathname: "/make-offer",
                    params: { listingId: listing.id },
                  })
                }
              >
                <Text style={styles.offerText}>Make Offer</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.buyBtn}
              onPress={() =>
                router.push({
                  pathname: "/checkout",
                  params: { listingId: listing.id },
                })
              }
            >
              <Text style={styles.buyText}>Buy Now</Text>
            </TouchableOpacity>
          </View>

          {/* DETAILS */}
          <Text style={styles.sectionTitle}>Details</Text>
          <DetailRow label="Condition" value={listing.condition} />
          <DetailRow label="Category" value={listing.category} />
          {listing.brand && (
            <DetailRow label="Brand" value={listing.brand} />
          )}

          {/* DESCRIPTION */}
          {listing.description && (
            <>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>
                {listing.description}
              </Text>
            </>
          )}

          {/* SELLER + MESSAGE BUTTON */}
          {!isSeller && (
            <View style={styles.sellerRow}>
              <Text style={styles.sellerText}>
                Sold by {sellerName ?? "Seller"}
              </Text>

              <TouchableOpacity
                style={styles.messageSellerBtn}
                onPress={handleMessageSeller}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={16}
                  color="#0F1E17"
                />
                <Text style={styles.messageSellerText}>
                  Message seller
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FULLSCREEN IMAGE */}
      <Modal visible={!!fullscreenImage} transparent animationType="fade">
        <View style={styles.modal}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setFullscreenImage(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.zoomWrap}
            maximumZoomScale={3}
            minimumZoomScale={1}
            centerContent
          >
            {fullscreenImage && (
              <Image
                source={{ uri: fullscreenImage }}
                style={styles.fullImage}
              />
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

/* ---------- HELPERS ---------- */

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  topBar: {
    paddingTop: 50,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  imagePage: {
    width: SCREEN_WIDTH,
    height: 360,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },

  image: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },

  content: {
    padding: 16,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    color: "#0F1E17",
  },

  likesText: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B8F7D",
    fontWeight: "700",
  },

  price: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: "900",
    color: "#0F1E17",
  },

  shipping: {
    marginTop: 2,
    fontSize: 13,
    color: "#6B8F7D",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  offerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7FAF9B",
    alignItems: "center",
    justifyContent: "center",
  },

  offerText: {
    fontWeight: "900",
    color: "#0F1E17",
  },

  buyBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0F1E17",
    alignItems: "center",
    justifyContent: "center",
  },

  buyText: {
    fontWeight: "900",
    color: "#FFFFFF",
  },

  sectionTitle: {
    marginTop: 22,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#D6E6DE",
  },

  detailLabel: {
    color: "#6B8F7D",
    fontWeight: "600",
  },

  detailValue: {
    color: "#0F1E17",
    fontWeight: "700",
  },

  description: {
    marginTop: 6,
    color: "#2E5F4F",
    lineHeight: 20,
  },

  sellerRow: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#D6E6DE",
    gap: 8,
  },

  sellerText: {
    fontSize: 13,
    color: "#6B8F7D",
    fontWeight: "600",
  },

  messageSellerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#0F1E17",
  },

  messageSellerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F1E17",
  },

  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },

  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },

  zoomWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  fullImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
})