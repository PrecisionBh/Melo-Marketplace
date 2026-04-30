import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import ListingHeroCard from "@/components/listing-v2/ListingHeroCard"
import ListingImageGallery from "@/components/listing-v2/ListingImageGallery"
import ListingMetaSection from "@/components/listing-v2/ListingMetaSection"
import ListingPurchaseActions from "@/components/listing-v2/ListingPurchaseActions"
import OwnerListingActions from "@/components/listing-v2/OwnerListingActions"
import SellerProfileCard from "@/components/listing-v2/SellerProfileCard"

import { useCart } from "@/context/CartContext"
import { useAuth } from "../../context/AuthContext"
import { handleAppError } from "../../lib/errors/appError"
import { supabase } from "../../lib/supabase"

type ListingSize = {
  size: string
  qty: number | string
}

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
  video_url?: string | null
  allow_offers: boolean
  shipping_type: "free" | "buyer_pays"
  shipping_price: number | null
  sizes: ListingSize[] | null
  quantity_available: number
  status: string
  subcategory?: string | null
}

export default function ListingDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()

  const [showAuthModal, setShowAuthModal] = useState(false)

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)

  const [sellerName, setSellerName] =
  useState<string | null>(null)

const [sellerAvatar, setSellerAvatar] =
  useState<string | null>(null)

const [isSellerPro, setIsSellerPro] =
  useState(false)

  const [sellerRatingAvg, setSellerRatingAvg] =
    useState<number | null>(null)
  const [sellerRatingCount, setSellerRatingCount] =
    useState(0)

  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const { refreshCartCount } = useCart()

 const [quantity, setQuantity] = useState(1)
const [selectedSize, setSelectedSize] = useState<string | null>(null)
const [following, setFollowing] = useState(false)

const [offerAmount, setOfferAmount] =
  useState("")

const [offerMessage, setOfferMessage] =
  useState("")

  const requireAuth = (action?: () => void) => {
    if (!session?.user) {
      setShowAuthModal(true)
      return
    }

    action?.()
  }

  useEffect(() => {
    if (id) loadListing()
  }, [id])

  useEffect(() => {
    if (listing?.id) loadWatchData()
  }, [listing?.id, session?.user?.id])

  useEffect(() => {
    if (listing?.user_id) loadSeller()
  }, [listing?.user_id])

  useEffect(() => {
  if (!listing) return

  setQuantity(1)

  if (Array.isArray(listing.sizes) && listing.sizes.length > 0) {
    setSelectedSize(listing.sizes[0].size)
  } else {
    setSelectedSize(null)
  }
}, [listing?.id])

  const images = useMemo(() => {
    return Array.isArray(listing?.image_urls)
      ? listing.image_urls
      : []
  }, [listing])

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
          video_url,
          allow_offers,
          shipping_type,
          shipping_price,
          quantity_available,
          sizes,
          subcategory,
          status
        `
        )
        .eq("id", id)
        .single()

      if (error || !data) {
        throw new Error("Listing not found")
      }

      setListing(data)

console.log("RAW image_urls:", data.image_urls)
console.log("RAW video_url:", data.video_url)

    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load listing.",
      })
      setListing(null)
    } finally {
      setLoading(false)
    }
  }

  const loadSeller = async () => {
    try {
      if (!listing?.user_id) return

      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, is_pro, avatar_url")
        .eq("id", listing.user_id)
        .single()

      if (error) throw error
      

      setSellerName(data?.display_name ?? null)
setSellerAvatar(data?.avatar_url ?? null)
setIsSellerPro(!!data?.is_pro)

      const { data: ratings, error: ratingsError } =
        await supabase
          .from("ratings")
          .select("rating")
          .eq("to_user_id", listing.user_id)

      if (ratingsError) throw ratingsError

      if (!ratings || ratings.length === 0) {
        setSellerRatingAvg(null)
        setSellerRatingCount(0)
      } else {
        const total = ratings.reduce(
          (sum, r) => sum + r.rating,
          0
        )
        setSellerRatingAvg(
          Number((total / ratings.length).toFixed(1))
        )
        setSellerRatingCount(ratings.length)
      }
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load seller info.",
      })
      setSellerName(null)
      setIsSellerPro(false)
      setSellerRatingAvg(null)
      setSellerRatingCount(0)
    }
  }

  const handleMessageSeller = async () => {
    try {
      if (!session?.user || !listing) {
        throw new Error("Missing session or listing")
      }

      const buyerId = session.user.id
      const sellerUserId = listing.user_id

      if (buyerId === sellerUserId) return

      let conversationId: string | null = null

      const { data: direct, error: directError } =
        await supabase
          .from("conversations")
          .select("id")
          .eq("user_one", buyerId)
          .eq("user_two", sellerUserId)
          .limit(1)

      if (directError) throw directError

      if (direct && direct.length > 0) {
        conversationId = direct[0].id
      } else {
        const {
          data: reverse,
          error: reverseError,
        } = await supabase
          .from("conversations")
          .select("id")
          .eq("user_one", sellerUserId)
          .eq("user_two", buyerId)
          .limit(1)

        if (reverseError) throw reverseError

        if (reverse && reverse.length > 0) {
          conversationId = reverse[0].id
        }
      }

      if (!conversationId) {
        const { data: created, error } =
          await supabase
            .from("conversations")
            .insert({
              user_one: buyerId,
              user_two: sellerUserId,
            })
            .select("id")
            .single()

        if (error || !created) {
          throw (
            error ??
            new Error("Failed to create conversation")
          )
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
      handleAppError(err, {
        fallbackMessage:
          "Unable to open chat with seller.",
      })
    }
  }

  const loadWatchData = async () => {
    try {
      if (!listing) return

      const { count, error: countError } =
        await supabase
          .from("watchlist")
          .select("*", { count: "exact", head: true })
          .eq("listing_id", listing.id)

      if (countError) throw countError

      setLikesCount(count ?? 0)

      if (!session?.user) {
        setLiked(false)
        return
      }

      const { data, error } = await supabase
        .from("watchlist")
        .select("id")
        .eq("listing_id", listing.id)
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (error) throw error

      setLiked(!!data)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to load watch data.",
      })
    }
  }

  const toggleWatch = async () => {
    try {
      if (!session?.user || !listing) {
        setShowAuthModal(true)
        return
      }

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
        const { error } = await supabase
          .from("watchlist")
          .insert({
            listing_id: listing.id,
            user_id: session.user.id,
          })

        if (error) throw error

        setLiked(true)
        setLikesCount((c) => c + 1)
      }
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to update watchlist.",
      })
    }
  }

  const handleViewPublicProfile = () => {
    requireAuth(() => {
      if (!listing?.user_id) return

      router.push({
        pathname: "/public-profile/[userId]",
        params: { userId: listing.user_id },
      })
    })
  }

  const toggleFollow = async () => {
  requireAuth(async () => {
    try {
      if (!listing || !session?.user?.id) return

      const { data: existing } =
        await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", session.user.id)
          .eq("following_id", listing.user_id)
          .maybeSingle()

      if (existing) {
        await supabase
          .from("follows")
          .delete()
          .eq("id", existing.id)

        setFollowing(false)
      } else {
        await supabase
          .from("follows")
          .insert({
            follower_id: session.user.id,
            following_id: listing.user_id,
          })

        setFollowing(true)
      }
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to update follow status.",
      })
    }
  })
}

  const handleBuyNow = () => {
  requireAuth(async () => {
    if (!listing || !session?.user?.id) return
    if (isApparel && !selectedSize) {
  Alert.alert("Select Size", "Please choose a size.")
  return
}
    try {
      const userId = session.user.id

      // 🔍 Check if item already in cart
      const { data: existing, error: existingError } =
        await supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("user_id", userId)
          .eq("listing_id", listing.id)
          .eq("size", selectedSize)
          .maybeSingle()

      if (existingError) throw existingError

      if (existing) {
        // 🔁 Update quantity instead of duplicating
        const nextQty = Math.min(
  (existing.quantity ?? 0) + quantity,
  isApparel ? selectedSizeQty : listing.quantity_available
)

        const { error: updateError } =
          await supabase
            .from("cart_items")
            .update({
              quantity: nextQty,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id)

        if (updateError) throw updateError
      } else {
        // ➕ Insert new item
        const { error: insertError } =
          await supabase
            .from("cart_items")
            .insert({
              user_id: userId,
              listing_id: listing.id,
              seller_id: listing.user_id,
              quantity: quantity,
              size: selectedSize,
              title: listing.title,
              price: listing.price,
              image_url: listing.image_urls?.[0] ?? null,
              shipping_type: listing.shipping_type,
              shipping_price: listing.shipping_price ?? 0,
            })

        if (insertError) throw insertError
      }

      router.push("/cart/checkout")
    } catch (err) {
      console.error("❌ Buy Now failed:", err)
    }
  })
}

  const handleMakeOffer = async () => {
  requireAuth(async () => {
    try {
      if (!listing) return

      if (!offerAmount.trim()) {
        Alert.alert(
          "Missing Offer",
          "Enter an offer amount."
        )
        return
      }

      const parsed = parseFloat(offerAmount)

      if (isNaN(parsed) || parsed <= 0) {
        Alert.alert(
          "Invalid Offer",
          "Enter a valid offer."
        )
        return
      }

      const { data: newOffer, error } =
        await supabase
          .from("offers")
          .insert({
            listing_id: listing.id,
            buyer_id: session!.user.id,
            seller_id: listing.user_id,

            offer_amount: parsed,
            original_offer: parsed,
            current_amount: parsed,

            quantity: quantity,
            size: selectedSize ?? null,
            subcategory: listing.subcategory ?? null,

            counter_count: 0,
            last_actor: "buyer",

            buyer_fee: Number(
              ((parsed * quantity) * 0.044 + 0.30).toFixed(2)
            ),

            total_due: Number(
              (
                (parsed * quantity) +
                (
                  listing.shipping_type === "buyer_pays"
                    ? (listing.shipping_price ?? 0)
                    : 0
                ) +
                ((parsed * quantity) * 0.044 + 0.30)
              ).toFixed(2)
            ),

            message: offerMessage.trim() || null,

            // 🔥 SNAPSHOT (CRITICAL)
            listing_snapshot: {
              title: listing.title,
              image_url: listing.image_urls?.[0] ?? null,
              price: listing.price,

              quantity: quantity,
              size: selectedSize ?? null,
              

              category: listing.category ?? null,
              subcategory: listing.subcategory ?? null,

              shipping_type: listing.shipping_type,

              metadata: {
                captured_at: new Date().toISOString(),
                source: "offer_created",
              },
            },

            status: "pending",
            expires_at: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(),
          })
          .select("id, seller_id")
          .single()

      console.log("CREATE OFFER:", { newOffer, error })

      if (error) throw error

      // 🔥 SEND NOTIFICATION TO SELLER
      try {
        await supabase.functions.invoke(
          "send-notification",
          {
            body: {
              userId: newOffer.seller_id,
              type: "offer_received",
              title: "New Offer Received 💰",
              body: `You received a new offer on "${listing.title}"`,
              data: {
                route: "/offers/[id]",
                params: {
                  id: newOffer.id,
                },
              },
              email: false,
            },
          }
        )
      } catch (notifErr) {
        console.log(
          "⚠️ Notification failed (non-blocking)",
          notifErr
        )
      }

      setOfferAmount("")
      setOfferMessage("")

      router.push({
        pathname: "/offers/[id]",
        params: { id: String(newOffer.id) },
      })

    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to submit offer.",
      })
    }
  })
}

  const handleAddToCart = async () => {
  requireAuth(async () => {
    try {
      if (!listing || !session?.user?.id) return
      if (isApparel && !selectedSize) {
  Alert.alert("Select Size", "Please choose a size.")
  return
}

      if (
  isApparel
    ? selectedSizeQty <= 0
    : listing.quantity_available <= 0
) {
  Alert.alert(
    "Unavailable",
    "This listing is out of stock."
  )
  return
}

      const safeQty = Math.min(
  Math.max(1, quantity),
  isApparel ? selectedSizeQty : listing.quantity_available
)

      const { data: existing, error: existingError } =
        await supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("user_id", session.user.id)
          .eq("listing_id", listing.id)
          .eq("size", selectedSize)
          .maybeSingle()

      if (existingError) throw existingError

      if (existing) {
        const nextQty = Math.min(
  (existing.quantity ?? 0) + safeQty,
  isApparel ? selectedSizeQty : listing.quantity_available
)

        const { error: updateError } =
          await supabase
            .from("cart_items")
            .update({
              quantity: nextQty,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", existing.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } =
          await supabase
            .from("cart_items")
            .insert({
              user_id: session.user.id,
              listing_id: listing.id,
              seller_id: listing.user_id,
              quantity: safeQty,
              size: selectedSize,
              title: listing.title,
              price: listing.price,
              image_url:
                listing.image_urls?.[0] ?? null,
              shipping_type:
                listing.shipping_type,
              shipping_price:
                listing.shipping_price ?? 0,
            })

        if (insertError) throw insertError
      }

      await refreshCartCount()

      Alert.alert(
        "Added to Cart",
        `${safeQty} ${
          safeQty === 1 ? "item" : "items"
        } added to your cart.`
      )
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to add item to cart.",
      })
    }
  })
}

 const toggleListingActive = async () => {
  if (!listing) return

  try {
    const isCurrentlyActive =
      listing.status === "active"

    const nextStatus = isCurrentlyActive
      ? "inactive"
      : "active"

    const { error } = await supabase
      .from("listings")
      .update({
        status: nextStatus,
        is_sold: isCurrentlyActive
          ? true
          : false,
      })
      .eq("id", listing.id)

    if (error) throw error

    setListing((prev) =>
      prev
        ? {
            ...prev,
            status: nextStatus,
            is_sold: !isCurrentlyActive
              ? false
              : true,
          }
        : prev
    )
  } catch (err) {
    handleAppError(err, {
      fallbackMessage:
        "Failed to update listing status.",
    })
  }
}

const duplicateListing = () => {
  if (!listing) return

  router.push({
    pathname: "/create-listing",
    params: {
      duplicate: "true",
      data: JSON.stringify(listing),
    },
  })
}

const deleteListing = () => {
  if (!listing) return

  Alert.alert(
    "Delete Listing",
    "Are you sure you want to permanently delete this listing?",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } =
              await supabase
                .from("listings")
                .delete()
                .eq("id", listing.id)

            if (error) throw error

            router.replace("/profile")
          } catch (err) {
            handleAppError(err, {
              fallbackMessage:
                "Failed to delete listing.",
            })
          }
        },
      },
    ]
  )
}
// 🔥 SAFE CALCULATIONS (MUST BE ABOVE RETURNS)
const isSeller =
  session?.user?.id === listing?.user_id

const isApparel =
  listing?.category === "clothing_apparel"

const selectedSizeQty = isApparel
  ? Number(
      listing?.sizes?.find((s) => s.size === selectedSize)?.qty ?? 0
    )
  : listing?.quantity_available ?? 0

const maxPurchaseQuantity = isApparel
  ? Math.max(1, selectedSizeQty || 0)
  : Math.max(1, listing?.quantity_available || 1)

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Text>Listing not found.</Text>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backRow}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color="#111"
          />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <ListingImageGallery
  images={images}
  videoUrl={listing.video_url}
/>

        <ListingHeroCard
  title={listing.title}
  price={listing.price}
  liked={liked}
  likesCount={likesCount}
  shippingType={listing.shipping_type}
  shippingPrice={listing.shipping_price}
  allowOffers={listing.allow_offers}
  quantityAvailable={listing.quantity_available}
  onToggleWatch={toggleWatch}
  listingId={listing.id} // 🔥 THIS WAS MISSING
/>

        <SellerProfileCard
  sellerName={sellerName}
  sellerAvatar={sellerAvatar}
  isSellerPro={isSellerPro}
  sellerRatingAvg={sellerRatingAvg}
  sellerRatingCount={sellerRatingCount}
  onViewProfile={handleViewPublicProfile}
/>

        <ListingMetaSection
  condition={listing.condition}
  category={listing.category}
  description={listing.description}
/>

       {isSeller ? (
  <OwnerListingActions
    isActive={listing.status === "active"}
    onEdit={() =>
      router.push(
        `/edit-listing/${listing.id}`
      )
    }
    onDuplicate={() =>
      duplicateListing()
    }
    onToggleActive={() =>
      toggleListingActive()
    }
    onDelete={() =>
      deleteListing()
    }
  />
) : (
  <ListingPurchaseActions
    isSeller={false}
    allowOffers={listing.allow_offers}
    quantity={quantity}
    setQuantity={setQuantity}
    maxQuantity={maxPurchaseQuantity}
sizes={Array.isArray(listing.sizes) ? listing.sizes : []}
selectedSize={selectedSize}
setSelectedSize={(val) => {
  setSelectedSize(val)
  setQuantity(1)
}}
    following={following}
    onToggleFollow={toggleFollow}
    offerAmount={offerAmount}
    setOfferAmount={setOfferAmount}
    offerMessage={offerMessage}
    setOfferMessage={setOfferMessage}
    onBuyNow={handleBuyNow}
    onAddToCart={handleAddToCart}
    onMakeOffer={handleMakeOffer}
    onMessageSeller={() =>
      requireAuth(() =>
        handleMessageSeller()
      )
    }
  />
)}
      </ScrollView>

      <GlobalFooter />

      {showAuthModal && (
        <View style={styles.authOverlay}>
          <View style={styles.authModal}>
            <Text style={styles.authTitle}>
              Sign in to continue
            </Text>

            <TouchableOpacity
              style={styles.authBtn}
              onPress={() => {
                setShowAuthModal(false)
                router.push("/signinscreen")
              }}
            >
              <Text style={styles.authBtnText}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.authBtnOutline}
              onPress={() => {
                setShowAuthModal(false)
                router.push("/register")
              }}
            >
              <Text
                style={
                  styles.authBtnOutlineText
                }
              >
                Create Account
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                setShowAuthModal(false)
              }
            >
              <Text style={styles.authCancel}>
                Not now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  content: {
    paddingBottom: 140,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F8F8",
  },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },

  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },

  authOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  authModal: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },

  authTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    color: "#111",
  },

  authBtn: {
    width: "100%",
    backgroundColor: "#D97732",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },

  authBtnText: {
    color: "#fff",
    fontWeight: "800",
  },

  authBtnOutline: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#D97732",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  authBtnOutlineText: {
    color: "#D97732",
    fontWeight: "800",
  },

  authCancel: {
    marginTop: 12,
    color: "#999",
  },
})