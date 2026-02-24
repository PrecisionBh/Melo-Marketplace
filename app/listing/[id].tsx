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

import AppHeader from "@/components/app-header"
import ListingDetailsSection from "@/components/listing/ListingDetailsSection"
import ListingHeaderCard from "@/components/listing/ListingHeaderCard"
import { useAuth } from "../../context/AuthContext"
import { handleAppError } from "../../lib/errors/appError"
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
  const [isSellerPro, setIsSellerPro] = useState(false)

  const [sellerRatingAvg, setSellerRatingAvg] = useState<number | null>(null)
  const [sellerRatingCount, setSellerRatingCount] = useState(0)

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
    return Array.isArray(listing?.image_urls) ? listing.image_urls : []
  }, [listing])

  /* ---------------- LOAD LISTING ---------------- */

  const loadListing = async () => {
    try {
      setLoading(true)

      if (!id) throw new Error("Missing listing id")

      const { data, error } = await supabase
        .from("listings")
        .select(
          `
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
        `
        )
        .eq("id", id)
        .single()

      if (error || !data) throw new Error("Listing not found")

      setListing(data)
    } catch (err) {
      handleAppError(err, { fallbackMessage: "Failed to load listing." })
      setListing(null)
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- LOAD SELLER (WITH MELO PRO + RATINGS) ---------------- */

  const loadSeller = async () => {
    try {
      if (!listing?.user_id) return

      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, is_pro")
        .eq("id", listing.user_id)
        .single()

      if (error) throw error

      setSellerName(data?.display_name ?? null)
      setIsSellerPro(!!data?.is_pro)

      const { data: ratings, error: ratingsError } = await supabase
        .from("ratings")
        .select("rating")
        .eq("to_user_id", listing.user_id)

      if (ratingsError) throw ratingsError

      if (!ratings || ratings.length === 0) {
        setSellerRatingAvg(null)
        setSellerRatingCount(0)
      } else {
        const total = ratings.reduce((sum, r) => sum + r.rating, 0)
        setSellerRatingAvg(Number((total / ratings.length).toFixed(1)))
        setSellerRatingCount(ratings.length)
      }
    } catch (err) {
      handleAppError(err, { fallbackMessage: "Failed to load seller info." })
      setSellerName(null)
      setIsSellerPro(false)
      setSellerRatingAvg(null)
      setSellerRatingCount(0)
    }
  }

  /* ---------------- MESSAGE SELLER (UNCHANGED) ---------------- */

  const handleMessageSeller = async () => {
    try {
      if (!session?.user || !listing) {
        throw new Error("Missing session or listing")
      }

      const buyerId = session.user.id
      const sellerId = listing.user_id
      if (buyerId === sellerId) return

      let conversationId: string | null = null

      const { data: direct, error: directError } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_one", buyerId)
        .eq("user_two", sellerId)
        .limit(1)

      if (directError) throw directError

      if (direct && direct.length > 0) {
        conversationId = direct[0].id
      } else {
        const { data: reverse, error: reverseError } = await supabase
          .from("conversations")
          .select("id")
          .eq("user_one", sellerId)
          .eq("user_two", buyerId)
          .limit(1)

        if (reverseError) throw reverseError

        if (reverse && reverse.length > 0) {
          conversationId = reverse[0].id
        }
      }

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
          throw error ?? new Error("Failed to create conversation")
        }

        conversationId = created.id
      }

      router.push({
        pathname: "/messages/[id]",
        params: {
          id: conversationId!,
          listingId: listing.id,
        },
      })
    } catch (err) {
      handleAppError(err, { fallbackMessage: "Unable to open chat with seller." })
    }
  }

  /* ---------------- WATCHLIST (UNCHANGED) ---------------- */

  const loadWatchData = async () => {
    try {
      if (!listing) return

      const { count, error: countError } = await supabase
        .from("watchlist")
        .select("*", { count: "exact", head: true })
        .eq("listing_id", listing.id)

      if (countError) throw countError

      setLikesCount(count ?? 0)

      if (!session?.user) return

      const { data, error } = await supabase
        .from("watchlist")
        .select("id")
        .eq("listing_id", listing.id)
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (error) throw error

      setLiked(!!data)
    } catch (err) {
      handleAppError(err, { fallbackMessage: "Failed to load watch data." })
    }
  }

  const toggleWatch = async () => {
    try {
      if (!session?.user || !listing) return

      if (liked) {
        const { error } = await supabase
          .from("watchlist")
          .delete()
          .eq("listing_id", listing.id)
          .eq("user_id", session.user.id)

        if (error) throw error

        setLiked(false)
        setLikesCount((c) => Math.max(0, c - 1))
      } else {
        const { error } = await supabase.from("watchlist").insert({
          listing_id: listing.id,
          user_id: session.user.id,
        })

        if (error) throw error

        setLiked(true)
        setLikesCount((c) => c + 1)
      }
    } catch (err) {
      handleAppError(err, { fallbackMessage: "Failed to update watchlist." })
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
      <AppHeader title="Listing" backRoute="/" />

      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        {/* IMAGE GALLERY */}
        {images.length === 0 ? (
          <View style={styles.imagePage}>
            <Ionicons name="image-outline" size={40} color="#666" />
          </View>
        ) : (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
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

        {/* HEADER CARD (MOVED DOWN — NO IMAGE OVERLAP) */}
        <ListingHeaderCard
          sellerName={sellerName}
          isSellerPro={isSellerPro}
          sellerRatingAvg={sellerRatingAvg}
          sellerRatingCount={sellerRatingCount}
          title={listing.title}
          price={listing.price}
          liked={liked}
          likesCount={likesCount}
          shippingType={listing.shipping_type}
          shippingPrice={listing.shipping_price}
          allowOffers={listing.allow_offers}
          onToggleWatch={toggleWatch}
          onMakeOffer={() =>
            router.push({
              pathname: "/make-offer",
              params: { listingId: listing.id },
            })
          }
          onBuyNow={() =>
            router.push({
              pathname: "/checkout",
              params: { listingId: listing.id },
            })
          }
        />

        {/* OPTIONAL: MESSAGE SELLER BUTTON ROW (ONLY IF NOT SELLER) */}
        {!isSeller && (
          <View style={styles.messageRow}>
            <TouchableOpacity
              onPress={handleMessageSeller}
              style={styles.messageSellerButton}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#0F1E17" />
              <Text style={styles.messageSellerText}>Message Seller</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* DETAILS + DESCRIPTION */}
        <ListingDetailsSection
          condition={listing.condition}
          category={listing.category}
          brand={listing.brand}
          description={listing.description}
        />
      </ScrollView>

      {/* FULLSCREEN IMAGE */}
      <Modal visible={!!fullscreenImage} transparent animationType="fade">
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setFullscreenImage(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.zoomWrap}
            maximumZoomScale={3}
            minimumZoomScale={1}
            centerContent
          >
            {fullscreenImage && <Image source={{ uri: fullscreenImage }} style={styles.fullImage} />}
          </ScrollView>
        </View>
      </Modal>
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

  messageRow: {
    marginHorizontal: 16,
    marginTop: 12,
  },

  messageSellerButton: {
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7FAF9B",
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  messageSellerText: {
    fontSize: 13,
    fontWeight: "900",
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