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

const MARKETPLACE_CATEGORIES: SelectorOption[] = [
  { label: "Electronics", value: "electronics" },
  { label: "Clothing / Apparel", value: "clothing_apparel" },
  { label: "Jewelry & Watches", value: "jewelry_watches" },
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

const APPAREL_TYPES: SelectorOption[] = [
  { label: "Tops", value: "tops" },
  { label: "Bottoms", value: "bottoms" },
  { label: "Dresses", value: "dresses" },
  { label: "Shoes", value: "shoes" },
  { label: "Accessories", value: "accessories" },
]

const JEWELRY_TYPES: SelectorOption[] = [
  { label: "Watches", value: "watches" },
  { label: "Rings", value: "rings" },
  { label: "Necklaces", value: "necklaces" },
  { label: "Bracelets", value: "bracelets" },
  { label: "Earrings", value: "earrings" },
]

const SIZE_MAP: Record<string, string[]> = {
  tops: ["XS", "S", "M", "L", "XL"],
  bottoms: ["30x30", "32x30", "32x32", "34x32", "36x32"],
  dresses: ["0", "2", "4", "6", "8", "10"],
  shoes: ["7", "8", "9", "10", "11", "12"],
}


export default function CreateListingScreen() {

  const [sizes, setSizes] = useState<{ size: string; qty: string }[]>([])

  const { session } = useAuth()
  const router = useRouter()

  

const [images, setImages] = useState<string[]>([])
  const [video, setVideo] = useState<any>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [subcategory, setSubcategory] = useState<string | null>(null)
const [showSubcategoryModal, setShowSubcategoryModal] = useState(false)


useEffect(() => {
  if (!subcategory) return

  const baseSizes = SIZE_MAP[subcategory]

  if (!baseSizes) {
    setSizes([])
    return
  }

  setSizes(
    baseSizes.map((size) => ({
      size,
      qty: "",
    }))
  )
}, [subcategory])
  const [condition, setCondition] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiHasRun, setAiHasRun] = useState(false)

  useEffect(() => {
  if (!images || images.length === 0) return
  if (aiLoading) return
  if (aiHasRun) return // 🔥 ONLY RUN ONCE

  const first = images[0]

  let uri: string | null = null

  if (typeof first === "string") {
    uri = first
  } else {
    uri = (first as any)?.uri ?? null
  }

  console.log("🖼 FIRST IMAGE URI:", uri)

  if (!uri) return

  // 🔥 LOCK BEFORE RUNNING (prevents race conditions)
  setAiHasRun(true)

  // 🔥 slight delay helps iOS not conflict with picker
  setTimeout(() => {
    runAI(uri)
  }, 400)
}, [images])

useEffect(() => {
  if (images.length === 0) {
    setAiHasRun(false)
  }
}, [images])

  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showConditionModal, setShowConditionModal] = useState(false)

  const [isBoosted, setIsBoosted] = useState(false)
  const [isMegaBoosted, setIsMegaBoosted] = useState(false)

  const [quantity, setQuantity] = useState("1")
  const [size, setSize] = useState<string | null>(null)
  const [boostsRemaining, setBoostsRemaining] = useState<number>(0)
  const [megaBoostsRemaining, setMegaBoostsRemaining] = useState<number>(0)

const [shippingType, setShippingType] = useState<"seller_pays" | "buyer_pays">("seller_pays")
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

/* ---------------- AI Creation ---------------- */

const getPublicImageUrl = async (localUri: string) => {
  // 🔥 READ FILE AS BASE64 (WORKS ON MOBILE)
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: "base64",
  })

  // 🔥 CONVERT BASE64 → BINARY
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }

  const byteArray = new Uint8Array(byteNumbers)

  const fileExtMatch = localUri.match(/\.(\w+)$/)
  const fileExt = fileExtMatch ? fileExtMatch[1] : "jpg"

  const fileName = `ai-temp/${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from("listing-images")
    .upload(fileName, byteArray, {
      contentType: `image/${fileExt}`,
      upsert: false,
    })

  if (uploadError) {
    console.log("❌ AI TEMP UPLOAD ERROR:", uploadError)
    throw uploadError
  }

  const { data } = supabase.storage
    .from("listing-images")
    .getPublicUrl(fileName)

  return data.publicUrl
}

const normalizeCondition = (cond?: string) => {
  if (!cond) return "good"

  const c = cond.toLowerCase()

  if (c.includes("new")) return "new"
  if (c.includes("like")) return "like_new"
  if (c.includes("good")) return "good"
  if (c.includes("fair")) return "fair"
  if (c.includes("poor") || c.includes("damaged")) return "poor"

  return "good"
}

const runAI = async (localUri: string) => {
  try {
    setAiLoading(true)

    // 🔥 CONVERT LOCAL IMAGE → PUBLIC URL
    const imageUrl = await getPublicImageUrl(localUri)

    console.log("🌐 AI IMAGE URL:", imageUrl)

    const { data, error } = await supabase.functions.invoke(
      "ai-generate-listing",
      {
        body: { imageUrl },
      }
    )

    if (error) {
      console.log("❌ AI ERROR:", error)
      return
    }

    console.log("🤖 AI RESULT:", data)

    if (!data) return

    // 🔥 ONLY FILL IF USER HASN’T TYPED
    if (!title && data.title) setTitle(data.title)
    if (!description && data.description) setDescription(data.description)

    if (data.category) setCategory(data.category)
    setCondition(normalizeCondition(data.condition))

    // 🔥 SUBCATEGORY DETECTION (APPAREL)
    if (data.category === "clothing_apparel") {
      const text = `${data.title || ""} ${data.description || ""}`.toLowerCase()

      let sub: string | null = null

      if (
        text.includes("shirt") ||
        text.includes("tee") ||
        text.includes("hoodie") ||
        text.includes("jacket") ||
        text.includes("sweater")
      ) sub = "tops"

      else if (
        text.includes("jean") ||
        text.includes("pants") ||
        text.includes("shorts") ||
        text.includes("jogger")
      ) sub = "bottoms"

      else if (text.includes("dress")) sub = "dresses"

      else if (
        text.includes("shoe") ||
        text.includes("sneaker") ||
        text.includes("boot") ||
        text.includes("trainer")
      ) sub = "shoes"

      else if (
        text.includes("hat") ||
        text.includes("cap") ||
        text.includes("belt") ||
        text.includes("bag")
      ) sub = "accessories"

      if (sub) setSubcategory(sub)
    }



    // 🔥 SUBCATEGORY DETECTION (JEWELRY)
    if (data.category === "jewelry_watches") {
      const text = `${data.title || ""} ${data.description || ""}`.toLowerCase()

      if (text.includes("watch")) setSubcategory("watches")
      else if (text.includes("ring")) setSubcategory("rings")
      else if (text.includes("necklace")) setSubcategory("necklaces")
      else if (text.includes("bracelet")) setSubcategory("bracelets")
      else if (text.includes("earring")) setSubcategory("earrings")
    }

    if (data.category === "clothing_apparel" && subcategory) {
  if (subcategory === "tops") {
    setSizes([{ size: "L", qty: "1" }])
  } else if (subcategory === "bottoms") {
    setSizes([{ size: "32x32", qty: "1" }])
  } else if (subcategory === "shoes") {
    setSizes([{ size: "10", qty: "1" }])
  } else if (subcategory === "dresses") {
    setSizes([{ size: "6", qty: "1" }])
  }
}

    // 🔥 PRICE + OFFERS LOGIC
    if (!price && data.price) {
      const priceNum = Number(data.price)
      setPrice(String(priceNum))

      // turn on offers
      setAllowOffers(true)

      // smart min offer
      let min

      if (priceNum < 25) min = priceNum * 0.8
      else if (priceNum < 100) min = priceNum * 0.7
      else min = priceNum * 0.65

      min = Math.round(min / 5) * 5

      setMinOffer(String(min))
    }

  } catch (err) {
    console.log("❌ AI FAIL:", err)
  } finally {
    setAiLoading(false)
  }
}

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

      if ((count ?? 0) >= 50) {
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
    subcategory: subcategory,

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

useEffect(() => {
  const timeout = setTimeout(() => {
    setCheckingAddress(false)
  }, 2000) // fallback safety

  return () => clearTimeout(timeout)
}, [])

const showLoading = checkingAddress

return (
  <View style={styles.screen}>
  <GlobalHeader />

  <View style={{ flex: 1 }}>
    
    {/* 🔥 LOADING OVERLAY (does NOT replace tree) */}
    {showLoading && (
  <View style={styles.loaderWrap} pointerEvents="none">
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
            setImages={setImages} // ✅ CLEAN (no AI here)
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
            subcategory={subcategory}
            condition={condition}
            conditionSubtext={
              CONDITIONS.find((c) => c.value === condition)?.subtext || ""
            }
            onPressCategory={() => setShowCategoryModal(true)}
            onPressSubcategory={() => setShowSubcategoryModal(true)}
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
            submitting={submitting}
          />
        </>
      )}

    </ScrollView>

    <Modal visible={aiLoading} transparent animationType="fade">
  <View style={styles.aiModalOverlay}>
    <View style={styles.aiModalCard}>
      <ActivityIndicator size="large" color="#D97732" />

      <Text style={styles.aiModalTitle}>
        Melo AI is creating your listing!
      </Text>

      <Text style={styles.aiModalText}>
        We sometimes make errors. Please look over the listing carefully and fix any mistakes.
      </Text>
    </View>
  </View>
</Modal>

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

  <FullScreenSelector
    visible={showSubcategoryModal}
    title="Select Type"
    options={
      category === "clothing_apparel"
        ? APPAREL_TYPES
        : JEWELRY_TYPES
    }
    selectedValue={subcategory ?? undefined}
    onSelect={(value) => {
      setSubcategory(value)
      setShowSubcategoryModal(false)
    }}
    onClose={() => setShowSubcategoryModal(false)}
  />

  <Modal visible={showLimitModal} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>
          You have reached your free plan limit
        </Text>

        <Text style={styles.modalText}>
          Free accounts can have up to 50 active listings.
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
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 999,
  elevation: 999,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(232,232,232,0.8)",
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

aiModalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.55)",
  justifyContent: "center",
  alignItems: "center",
  padding: 24,
},

aiModalCard: {
  width: "100%",
  backgroundColor: "#FFFFFF",
  borderRadius: 20,
  padding: 24,
  alignItems: "center",
},

aiModalTitle: {
  marginTop: 16,
  fontSize: 18,
  fontWeight: "900",
  color: "#111827",
  textAlign: "center",
},

aiModalText: {
  marginTop: 10,
  fontSize: 13,
  lineHeight: 19,
  color: "#6B7280",
  textAlign: "center",
},
})