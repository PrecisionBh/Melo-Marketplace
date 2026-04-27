// app/create-listing.tsx

import CreateListingBoost from "@/components/create-listing/CreateListingBoost"
import CreateListingDetails from "@/components/create-listing/CreateListingDetails"
import CreateListingOffers from "@/components/create-listing/CreateListingOffers"
import CreateListingSelectors from "@/components/create-listing/CreateListingSelectors"
import CreateListingShipping from "@/components/create-listing/CreateListingShipping"
import FullScreenSelector from "@/components/create-listing/FullScreenSelector"
import ImageUpload from "@/components/create-listing/ImageUpload"
import * as FileSystem from "expo-file-system/legacy"

import { Video as VideoCompressor } from "react-native-compressor"

import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import ReturnAddressRequiredModal from "@/components/modals/ReturnAddressRequiredModal"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"


import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

type ProfileRow = {
  is_pro: boolean | null
  boosts_remaining: number | null
  mega_boosts_remaining?: number | null
}

type SelectorOption = {
  label: string
  value: string
  subtext?: string
}

/* ---------------- SELECTOR DATA ---------------- */

/* ---------------- SELECTOR DATA ---------------- */

const MARKETPLACE_CATEGORIES: SelectorOption[] = [
  { label: "Electronics", value: "electronics" },
  { label: "Clothing / Apparel", value: "clothing_apparel" },
  { label: "Home & Garden", value: "home_garden" },
  { label: "Sports & Outdoors", value: "sports_outdoors" },
  { label: "Collectibles", value: "collectibles" },
  { label: "Automotive", value: "automotive" },
  { label: "Toys & Games", value: "toys_games" },
  { label: "Baby & Kids", value: "baby_kids" },
  { label: "Beauty & Health", value: "beauty_health" },
  { label: "Tools", value: "tools" },
  { label: "Music / Instruments", value: "music_instruments" },
  { label: "Pet Supplies", value: "pet_supplies" },
  { label: "Books & Media", value: "books_media" },
  { label: "Office Supplies", value: "office_supplies" },
  { label: "Art & Handmade", value: "art_handmade" },
  { label: "Other", value: "other" },
]

//conditions//

const CONDITIONS: SelectorOption[] = [
  { label: "New", value: "new", subtext: "Brand new, unused, and in original condition." },
  { label: "Like New", value: "like_new", subtext: "Very lightly used with little to no visible wear." },
  { label: "Good", value: "good", subtext: "Used but well maintained. Minor cosmetic wear only." },
  { label: "Fair", value: "fair", subtext: "Noticeable wear, scratches, or cosmetic flaws." },
  { label: "Poor", value: "poor", subtext: "Heavy wear, damage, or needs repair." },
]



export default function CreateListingScreen() {

  const [sizes, setSizes] = useState([
  { size: "XS", qty: "0" },
  { size: "S", qty: "0" },
  { size: "M", qty: "0" },
  { size: "L", qty: "0" },
  { size: "XL", qty: "0" },
])

  const { session } = useAuth()
  const router = useRouter()

  const [images, setImages] = useState<string[]>([])
  const [video, setVideo] = useState<any>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [condition, setCondition] = useState<string | null>(null)

  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showConditionModal, setShowConditionModal] = useState(false)

  const [isBoosted, setIsBoosted] = useState(false)
  const [isMegaBoosted, setIsMegaBoosted] = useState(false)

  const [quantity, setQuantity] = useState("1")
  const [size, setSize] = useState<string | null>(null)
  const [boostsRemaining, setBoostsRemaining] = useState<number>(0)
  const [megaBoostsRemaining, setMegaBoostsRemaining] = useState<number>(0)

const [shippingType, setShippingType] =
  useState<"seller_pays" | "buyer_pays">("buyer_pays")
const [weight, setWeight] = useState("")
const [zipCode, setZipCode] = useState("")
const [length, setLength] = useState("")
const [width, setWidth] = useState("")
const [height, setHeight] = useState("")

  const [shippingPrice, setShippingPrice] = useState("")
  

  const [price, setPrice] = useState("")

  const [allowOffers, setAllowOffers] = useState(false)
  const [minOffer, setMinOffer] = useState("")

  const [submitting, setSubmitting] = useState(false)

  const [checkingAddress, setCheckingAddress] = useState(true)
  const [hasReturnAddress, setHasReturnAddress] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)

  const [checkingPro, setCheckingPro] = useState(true)
  const [isPro, setIsPro] = useState<boolean>(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const { duplicate, data } = useLocalSearchParams()

  useEffect(() => {
  if (duplicate && data) {
    try {
      const parsed = JSON.parse(data as string)

      setTitle(parsed.title || "")
      setDescription(parsed.description || "")
      setCategory(parsed.category || null)
      setCondition(parsed.condition || null)

      setPrice(
        parsed.price ? String(parsed.price) : ""
      )

      setImages(parsed.image_urls || [])
      setVideo(parsed.video_url || null) // ✅ FIXED (was setVideoUrl)

      setShippingType(
        parsed.shipping_type || "buyer_pays"
      )

      setShippingPrice(
        parsed.shipping_price
          ? String(parsed.shipping_price)
          : ""
      )

      setAllowOffers(parsed.allow_offers || false)

      // 👕 sizes
      if (Array.isArray(parsed.sizes)) {
  const baseSizes = ["XS", "S", "M", "L", "XL"]

  setSizes(
    baseSizes.map((size) => {
      const found = parsed.sizes.find(
        (s: any) => s.size === size
      )

      return {
        size,
        qty: found ? String(found.qty) : "",
      }
    })
  )
}

      // 📦 quantity
      setQuantity(
        parsed.quantity_available
          ? String(parsed.quantity_available)
          : "1"
      )
    } catch (err) {
      console.log("❌ Duplicate parse error:", err)
    }
  }
}, [duplicate, data])

/* ---------------- RESET CATEGORY + BRAND WHEN SPORT CHANGES ---------------- */

const handleCreateListing = async () => {
  if (!session?.user) return
  if (!hasReturnAddress) {
  setShowAddressModal(true)
  return
}
  if (submitting) return

  try {
    setSubmitting(true)

    // 🔒 FREE PLAN GUARD
    if (!isPro) {
      const { count, error: countError } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .eq("is_sold", false)

      if (countError) throw countError

      if ((count ?? 0) >= 8) {
        setShowLimitModal(true)
        setSubmitting(false)
        return
      }
    }

    const parsedPrice = parseFloat(price)
    const parsedMinOffer = minOffer ? parseFloat(minOffer) : null
    const parsedShippingPrice = shippingPrice ? parseFloat(shippingPrice) : 0

    const rawQty = parseInt(quantity, 10)
    const safeQuantity = isPro
      ? Math.max(1, Number.isFinite(rawQty) ? rawQty : 1)
      : 1

      if (!title.trim() || !category || !condition || images.length === 0) {
  Alert.alert(
    "Missing Details",
    "Please complete all required fields."
  )
  return
}

if (category === "clothing_apparel") {
  const hasQty = sizes.some(s => parseInt(s.qty) > 0)

  if (!hasQty) {
    Alert.alert("Missing Sizes", "Enter quantity for at least one size.")
    return
  }
}

    if (isNaN(parsedPrice)) {
      Alert.alert("Invalid Price", "Please enter a valid price.")
      return
    }

    /* ---------------- PARALLEL IMAGE UPLOAD ---------------- */

    const uploadPromises = images.map(async (uri) => {
      const response = await fetch(uri)
      const arrayBuffer = await response.arrayBuffer()

      const fileExtMatch = uri.match(/\.(\w+)$/)
      const fileExt = fileExtMatch ? fileExtMatch[1] : "jpg"

      const fileName = `${session.user.id}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: false,
        })

      if (uploadError) {
        console.log("Upload error:", uploadError)
        throw uploadError
      }

      const { data } = supabase.storage
        .from("listing-images")
        .getPublicUrl(fileName)

      return data.publicUrl
    })

    const uploadedImageUrls = await Promise.all(uploadPromises)

   /* ---------------- VIDEO UPLOAD ---------------- */

let videoUrl = null
console.log("VIDEO STATE:", video)

if (video) {
  try {
    console.log("VIDEO URI:", video.uri)

    if (video.fileSize && video.fileSize > 80000000) {
      Alert.alert(
        "Video too large",
        "Please choose a smaller video or lower quality recording."
      )
      setSubmitting(false)
      return
    }

    const fileName = `${session.user.id}/${Date.now()}-video.mp4`

    // 🔥 STEP 1: COMPRESS VIDEO
    const compressedUri = await VideoCompressor.compress(video.uri, {
      compressionMethod: "auto",
    })

    console.log("COMPRESSED VIDEO:", compressedUri)

    // 🔥 STEP 2: GET FILE INFO
    const fileInfo = await FileSystem.getInfoAsync(compressedUri)

    if (!fileInfo.exists) {
      throw new Error("Compressed video not found")
    }

    if (fileInfo.size && fileInfo.size > 20000000) {
      Alert.alert(
        "Video too large",
        "Please use a shorter or lower quality video."
      )
      setSubmitting(false)
      return
    }

    // 🔥 STEP 3: READ FILE AS BASE64
    const base64 = await FileSystem.readAsStringAsync(compressedUri, {
      encoding: "base64",
    })

    // 🔥 STEP 4: CONVERT TO ARRAY BUFFER
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)

    // 🔥 STEP 5: UPLOAD TO SUPABASE
    const { error: uploadError } = await supabase.storage
      .from("listing-videos")
      .upload(fileName, byteArray, {
        contentType: "video/mp4",
        upsert: false,
      })

    if (uploadError) {
      console.log("UPLOAD ERROR:", uploadError)
      throw uploadError
    }

    // 🔥 STEP 6: GET PUBLIC URL
    const { data } = supabase.storage
      .from("listing-videos")
      .getPublicUrl(fileName)

    videoUrl = data.publicUrl

    console.log("VIDEO UPLOADED:", videoUrl)
  } catch (err) {
    console.warn("Video upload failed:", err)
  }
}
    /* ---------------- INSERT LISTING ---------------- */

const filteredSizes = sizes.filter(s => parseInt(s.qty) > 0)

const totalQty = filteredSizes.reduce(
  (sum, s) => sum + parseInt(s.qty),
  0
)

const { data, error } = await supabase
  .from("listings")
  .insert({
    user_id: session.user.id,
    title: title.trim(),
    description: description.trim() || null,
    brand: null,
    category: category,

    // 🔥 SIZE SYSTEM (NEW)
    sizes: category === "clothing_apparel" ? filteredSizes : null,

    // 🔥 KEEP FOR BACKWARD COMPAT (optional but safe)
    size: category === "clothing_apparel" ? null : size,

    condition: condition,
    price: parsedPrice,
    allow_offers: allowOffers,
    min_offer: allowOffers ? parsedMinOffer : null,

    shipping_type: shippingType,
    shipping_price: parsedShippingPrice,

    image_urls: uploadedImageUrls,
    video_url: videoUrl,

    // 🔥 QUANTITY LOGIC
    quantity:
      category === "clothing_apparel"
        ? totalQty
        : safeQuantity,

    quantity_available:
      category === "clothing_apparel"
        ? totalQty
        : safeQuantity,
  })
  .select("id")
  .single()

if (error) throw error

   /* ---------------- BOOST LOGIC ---------------- */

if (data?.id) {
  try {
    if (isMegaBoosted) {
      const { error: megaError } = await supabase.rpc("mega_boost_listing", {
        listing_id: data.id,
        user_id: session.user.id,
      })

      if (megaError) {
        console.warn("Mega Boost failed:", megaError.message)
      }
    } else if (isBoosted) {
      const { error: boostError } = await supabase.rpc("boost_listing", {
        listing_id: data.id,
        user_id: session.user.id,
      })

      if (boostError) {
        console.warn("Boost failed:", boostError.message)
      }
    }
  } catch (err) {
    console.warn("Boost RPC error:", err)
  }
}

Alert.alert("Success", "Your listing has been created!")
router.replace("/profile")
} catch (err) {
handleAppError(err, {
  context: "create_listing_insert",
  fallbackMessage: "Failed to create listing. Please try again.",
})
} finally {
setSubmitting(false)
}
}

useFocusEffect(
useCallback(() => {
  const loadGuards = async () => {
    if (!session?.user) {
      setCheckingAddress(false)
      setCheckingPro(false)
      return
    }

    try {
      setCheckingAddress(true)
      setCheckingPro(true)

      const { data: profileAddress, error: addressError } = await supabase
  .from("profiles")
  .select("address_line1, city, state, postal_code")
  .eq("id", session.user.id)
  .maybeSingle()

if (addressError) {
  console.error("❌ Failed fetching return address", addressError)
}

const hasAddress =
  !!profileAddress?.address_line1 &&
  !!profileAddress?.city &&
  !!profileAddress?.state &&
  !!profileAddress?.postal_code

setHasReturnAddress(hasAddress)
setShowAddressModal(!hasAddress)

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("is_pro, boosts_remaining, mega_boosts_remaining")
  .eq("id", session.user.id)
  .single<ProfileRow>()

if (profileError) {
  console.error("❌ Failed fetching profile", profileError)
}

setIsPro(Boolean(profile?.is_pro))
setBoostsRemaining(profile?.boosts_remaining ?? 0)
setMegaBoostsRemaining(profile?.mega_boosts_remaining ?? 0)
    } finally {
      setCheckingAddress(false)
      setCheckingPro(false)
    }
  }

  loadGuards()
}, [session?.user?.id])
)

const showLoading = checkingAddress

return (
  <View style={styles.screen}>
  <GlobalHeader />

  <View style={{ flex: 1 }}>
    
    {/* 🔥 LOADING OVERLAY (does NOT replace tree) */}
    {showLoading && (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#D97732" />
      </View>
    )}

    {/* 🔥 ALWAYS MOUNT SCROLLVIEW */}
    <ScrollView contentContainerStyle={styles.content}>
      
      {!hasReturnAddress ? (
        <Text>Checking address...</Text>
      ) : (
        <>
          <ImageUpload
            images={images}
            setImages={setImages}
            video={video}
            setVideo={setVideo}
            max={5}
          />

          <CreateListingDetails
            title={title}
            setTitle={setTitle}
            price={price}
            setPrice={setPrice}
            quantity={quantity}
            setQuantity={setQuantity}
            description={description}
            setDescription={setDescription}
          />

          <CreateListingSelectors
            category={category}
            condition={condition}
            conditionSubtext={
              CONDITIONS.find((c) => c.value === condition)?.subtext || ""
            }
            onPressCategory={() => setShowCategoryModal(true)}
            onPressCondition={() => setShowConditionModal(true)}
            sizes={sizes}
            setSizes={setSizes}
            isPro={isPro}
          />

          <CreateListingShipping
            shippingType={shippingType}
            setShippingType={setShippingType}
            weight={weight}
            setWeight={setWeight}
            zipCode={zipCode}
            setZipCode={setZipCode}
            length={length}
            setLength={setLength}
            width={width}
            setWidth={setWidth}
            height={height}
            setHeight={setHeight}
          />

          <CreateListingOffers
            allowOffers={allowOffers}
            setAllowOffers={setAllowOffers}
            minOffer={minOffer}
            setMinOffer={setMinOffer}
          />

          <CreateListingBoost
            selectedBoost={
              isMegaBoosted ? "mega" : isBoosted ? "boost" : "none"
            }
            setSelectedBoost={(val) => {
              setIsBoosted(val === "boost")
              setIsMegaBoosted(val === "mega")
            }}
            boostCredits={boostsRemaining}
            megaCredits={megaBoostsRemaining}
            onBuyCredits={() => router.push("/boostcredits")}
            onPublish={handleCreateListing}
          />
        </>
      )}

    </ScrollView>
  </View>

  <GlobalFooter />

    <FullScreenSelector
      visible={showCategoryModal}
      title="Select Category"
      options={MARKETPLACE_CATEGORIES}
      selectedValue={category ?? undefined}
      onSelect={(value) => {
        setCategory(value)
        setShowCategoryModal(false)
      }}
      onClose={() => setShowCategoryModal(false)}
    />

    <FullScreenSelector
      visible={showConditionModal}
      title="Select Condition"
      options={CONDITIONS}
      selectedValue={condition ?? undefined}
      onSelect={(value) => {
        setCondition(value)
        setShowConditionModal(false)
      }}
      onClose={() => setShowConditionModal(false)}
    />

    <Modal visible={showLimitModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            You have reached your free plan limit
          </Text>

          <Text style={styles.modalText}>
            Free accounts can only have 5 active listings.
            Upgrade to Melo Pro to unlock unlimited listings and more Pro features.
          </Text>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => {
              setShowLimitModal(false)
              router.push("/melo-pro")
            }}
          >
            <Text style={styles.upgradeButtonText}>
              Upgrade to Pro
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowLimitModal(false)}>
            <Text style={styles.laterText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    <ReturnAddressRequiredModal
      visible={showAddressModal}
      onClose={() => setShowAddressModal(false)}
    />
  </View>
)
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#e8e8e8" },

  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 140,
  },

  sectionSpacing: {
    marginTop: 18,
  },

  /* ---------------- MODAL ---------------- */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },

  modalText: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
  },

  upgradeButton: {
    backgroundColor: "#7FAF9B",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },

  upgradeButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  laterText: {
    color: "#888",
    fontSize: 14,
  },

  /* ---------------- BOOST SECTION (UPDATED) ---------------- */

  boostHeader: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },

  boostCounterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  boostCounter: {
    fontSize: 13,
    fontWeight: "800",
    color: "#7FAF9B",
  },

  boostSub: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },

  boostRow: {
    flexDirection: "row",
    gap: 10,
  },

  boostOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },

  boostOptionActive: {
    borderColor: "#7FAF9B",
    backgroundColor: "#EAF4EF",
  },

  boostOptionTitle: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },

  boostOptionDesc: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },

  boostLink: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#7FAF9B",
    textAlign: "center",
  },

  boostSectionWrap: {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 14,
},
})