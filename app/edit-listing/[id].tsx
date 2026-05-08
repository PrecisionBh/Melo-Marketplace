import CreateListingBoost from "@/components/create-listing/CreateListingBoost"
import CreateListingDetails from "@/components/create-listing/CreateListingDetails"
import CreateListingOffers from "@/components/create-listing/CreateListingOffers"
import CreateListingSelectors from "@/components/create-listing/CreateListingSelectors"
import CreateListingShipping from "@/components/create-listing/CreateListingShipping"
import FullScreenSelector from "@/components/create-listing/FullScreenSelector"
import ImageUpload from "@/components/create-listing/ImageUpload"
import SKUInput from "@/components/listing-v2/sku"
import * as FileSystem from "expo-file-system/legacy"
import { Video as VideoCompressor } from "react-native-compressor"

import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import ReturnAddressRequiredModal from "@/components/modals/ReturnAddressRequiredModal"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"

type ProfileRow = {
  boosts_remaining: number | null
}

type SelectorOption = {
  label: string
  value: string
  subtext?: string
}

type ListingRow = {
  id: string
  user_id: string
  title: string | null
  description: string | null
  price: number | null
  category: string | null
subcategory: string | null
condition: string | null
  image_urls: string[] | null
  video_url?: string | null
  allow_offers: boolean | null
  min_offer: number | null
  shipping_type: "seller_pays" | "buyer_pays" | null
  shipping_price: number | null
  quantity: number | null
  quantity_available: number | null
  is_boosted: boolean | null
  size: string | null
sizes: { size: string; qty: number | string }[] | null
sku: string | null
}

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

const CONDITIONS: SelectorOption[] = [
  {
    label: "New",
    value: "new",
    subtext:
      "Brand new, unused, and in original condition.",
  },
  {
    label: "Like New",
    value: "like_new",
    subtext:
      "Very lightly used with little to no visible wear.",
  },
  {
    label: "Good",
    value: "good",
    subtext:
      "Used but well maintained. Minor cosmetic wear only.",
  },
  {
    label: "Fair",
    value: "fair",
    subtext:
      "Noticeable wear, scratches, or cosmetic flaws.",
  },
  {
    label: "Poor",
    value: "poor",
    subtext:
      "Heavy wear, damage, or needs repair.",
  },
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

export default function EditListingScreen() {
  const { session } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams()
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : undefined

  const [loadingListing, setLoadingListing] =
    useState(true)
  const [submitting, setSubmitting] =
    useState(false)

  const [images, setImages] = useState<string[]>([])
  const [video, setVideo] = useState<any>(null)
const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] =
    useState("")
  const [category, setCategory] = useState<
    string | null
  >(null)
  const [sku, setSku] = useState("")
  const [subcategory, setSubcategory] = useState<string | null>(null)
const [showSubcategoryModal, setShowSubcategoryModal] = useState(false)

useEffect(() => {
  if (!subcategory) return

  const baseSizes = SIZE_MAP[subcategory]

  if (!baseSizes) {
    setSizes([])
    return
  }

  setSizes((prev) =>
    baseSizes.map((size) => {
      const existing = prev.find((s) => s.size === size)

      return {
        size,
        qty: existing?.qty ?? "",
      }
    })
  )
}, [subcategory])

  const [condition, setCondition] = useState<
    string | null
  >(null)

  const [showCategoryModal, setShowCategoryModal] =
    useState(false)
  const [showConditionModal, setShowConditionModal] =
    useState(false)

  const [isBoosted, setIsBoosted] =
    useState(false)

  const [originalBoosted, setOriginalBoosted] =
    useState(false)

  const [quantity, setQuantity] = useState("1")
  const [size, setSize] = useState<string | null>(null)
  const [sizes, setSizes] = useState<{ size: string; qty: string }[]>([])
  const [boostsRemaining, setBoostsRemaining] =
    useState<number>(0)

  const [shippingType, setShippingType] =
    useState<"seller_pays" | "buyer_pays">(
      "buyer_pays"
    )
  const [weight, setWeight] = useState("")
  const [zipCode, setZipCode] = useState("")
  const [length, setLength] = useState("")
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [shippingPrice, setShippingPrice] =
    useState("")

  const [price, setPrice] = useState("")
  const [allowOffers, setAllowOffers] =
    useState(false)
  const [minOffer, setMinOffer] = useState("")

  const [checkingAddress, setCheckingAddress] =
    useState(true)
  const [hasReturnAddress, setHasReturnAddress] =
    useState(false)
  const [showAddressModal, setShowAddressModal] =
    useState(false)


  useEffect(() => {
    if (id) {
      loadListing()
    }
  }, [id])

  useEffect(() => {
    const loadGuards = async () => {
      if (!session?.user) {
        setCheckingAddress(false)
        return
      }

      try {
        setCheckingAddress(true)

        const { data: profileAddress, error: addressError } = await supabase
  .from("profiles")
  .select("address_line1, city, state, postal_code")
  .eq("id", session.user.id)
  .maybeSingle()

if (addressError) {
  console.error(
    "❌ Failed fetching return address",
    addressError
  )
}

const hasAddress =
  !!profileAddress?.address_line1 &&
  !!profileAddress?.city &&
  !!profileAddress?.state &&
  !!profileAddress?.postal_code

setHasReturnAddress(hasAddress)
setShowAddressModal(!hasAddress)

        const { data: profile } = await supabase
  .from("profiles")
  .select("boosts_remaining")
  .eq("id", session.user.id)
  .single<ProfileRow>()

setBoostsRemaining(
  profile?.boosts_remaining ?? 0
)
      } catch (err) {
        handleAppError(err, {
          fallbackMessage:
            "Failed to load edit listing data.",
        })
      } finally {
        setCheckingAddress(false)
      }
    }

    loadGuards()
  }, [session?.user?.id])

  const loadListing = async () => {
    try {
      setLoadingListing(true)

      if (!id) {
        throw new Error("Missing listing id")
      }

      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single<ListingRow>()

      if (error || !data) {
        throw error ?? new Error("Listing not found")
      }

      setTitle(data.title ?? "")
setDescription(data.description ?? "")

const safeCategory: string | null =
  data.category === "fashion"
    ? "clothing_apparel"
    : data.category ?? null

setCategory(safeCategory)
setSubcategory(data.subcategory || null)

setCondition(data.condition ?? null)
setSize(data.size || null)

if (
  safeCategory === "clothing_apparel" &&
  Array.isArray(data.sizes)
) {
  setSizes(
    data.sizes.map((s: any) => ({
      size: String(s.size),
      qty: String(s.qty ?? ""),
    }))
  )
}

      setPrice(
        typeof data.price === "number"
          ? String(data.price)
          : ""
      )

      setAllowOffers(!!data.allow_offers)
      setMinOffer(
        typeof data.min_offer === "number"
          ? String(data.min_offer)
          : ""
      )

      setShippingType(
        data.shipping_type ?? "buyer_pays"
      )

      setShippingPrice(
        typeof data.shipping_price === "number"
          ? String(data.shipping_price)
          : ""
      )

      setImages(data.image_urls ?? [])
      setExistingVideoUrl(data.video_url ?? null)

      const safeLoadedQty =
        data.quantity_available && data.quantity_available > 0
          ? data.quantity_available
          : data.quantity && data.quantity > 0
          ? data.quantity
          : 1

      setQuantity(String(safeLoadedQty))
      setSku(data.sku ?? "")
      setIsBoosted(Boolean(data.is_boosted))
    
      setOriginalBoosted(Boolean(data.is_boosted))
     
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to load listing.",
      })
      router.back()
    } finally {
      setLoadingListing(false)
    }
  }

  const handleUpdateListing = async () => {
    if (!session?.user || !id || submitting) return

    try {
      setSubmitting(true)

      const parsedPrice = parseFloat(price)
      const parsedMinOffer = minOffer
        ? parseFloat(minOffer)
        : null
      const parsedShippingPrice = shippingPrice
        ? parseFloat(shippingPrice)
        : 0

      const rawQty = parseInt(quantity, 10)
     const safeQuantity = Math.max(
  1,
  Number.isFinite(rawQty) ? rawQty : 1
)

      if (
  !title.trim() ||
  !category ||
  !condition ||
  images.length === 0
) {
  Alert.alert(
    "Missing Details",
    "Please complete all required fields."
  )
  return
}

// 👕 SIZE VALIDATION (MATCH CREATE LISTING)
if (category === "clothing_apparel") {
  const hasQty = sizes.some(
    (s) => parseInt(String(s.qty), 10) > 0
  )

  if (!hasQty) {
    Alert.alert(
      "Missing Sizes",
      "Enter quantity for at least one size."
    )
    return
  }
}

      if (isNaN(parsedPrice)) {
        Alert.alert(
          "Invalid Price",
          "Please enter a valid price."
        )
        return
      }

      const uploadedImageUrls: string[] = []

      for (const uri of images) {
        if (uri.startsWith("http")) {
          uploadedImageUrls.push(uri)
          continue
        }

        const response = await fetch(uri)
        const arrayBuffer =
          await response.arrayBuffer()

        const fileExtMatch = uri.match(/\.(\w+)$/)
        const fileExt = fileExtMatch
          ? fileExtMatch[1]
          : "jpg"

        const fileName = `${session.user.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 9)}.${fileExt}`

        const { error: uploadError } =
          await supabase.storage
            .from("listing-images")
            .upload(fileName, arrayBuffer, {
              contentType: `image/${fileExt}`,
              upsert: false,
            })

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from("listing-images")
          .getPublicUrl(fileName)

        uploadedImageUrls.push(data.publicUrl)
      }

      /* ---------------- VIDEO UPLOAD ---------------- */

let videoUrl = existingVideoUrl

// 🔥 CASE 1: NEW VIDEO SELECTED
if (video && video.uri && !video.uri.startsWith("http")) {
  try {
    console.log("VIDEO URI:", video.uri)

    // 🔥 STEP 1: COMPRESS
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

    const fileName = `${session.user.id}/${Date.now()}-video.mp4`

    // 🔥 STEP 5: UPLOAD
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

    // 🔥 STEP 6: GET URL
    const { data } = supabase.storage
      .from("listing-videos")
      .getPublicUrl(fileName)

    videoUrl = data.publicUrl

    console.log("VIDEO UPDATED:", videoUrl)
  } catch (err) {
    console.warn("Video upload failed:", err)
  }
}

// 🔥 CASE 2: USER REMOVED VIDEO
if (!video && !existingVideoUrl) {
  videoUrl = null
}

/* HANDLE REMOVAL */
if (!video && !existingVideoUrl) {
  videoUrl = null
}

// 🔥 ADD THIS RIGHT BEFORE updatePayload
let filteredSizes: { size: string; qty: number }[] = []
let totalQty = 0

if (category === "clothing_apparel") {
  filteredSizes = sizes
    .map((s) => ({
      size: s.size,
      qty: parseInt(s.qty, 10) || 0,
    }))
    .filter((s) => s.qty > 0)

  totalQty = filteredSizes.reduce(
    (sum, s) => sum + s.qty,
    0
  )
}
      const updatePayload = {
        title: title.trim(),
        description: description.trim() || null,
        brand: null,
        category,
subcategory,
condition,
        sizes: category === "clothing_apparel" ? filteredSizes : null,
size: category === "clothing_apparel" ? null : size,
        price: parsedPrice,
        allow_offers: allowOffers,
        min_offer: allowOffers
          ? parsedMinOffer
          : null,
        shipping_type: shippingType,
        shipping_price: parsedShippingPrice,
        image_urls: uploadedImageUrls,
        video_url: videoUrl,
        quantity:
  category === "clothing_apparel"
    ? totalQty
    : safeQuantity,

quantity_available:
  category === "clothing_apparel"
    ? totalQty
    : safeQuantity,

sku: sku || null,

boost_locked: !isBoosted,
}

      const { error } = await supabase
        .from("listings")
        .update(updatePayload)
        .eq("id", id)

      if (error) throw error

      if (id) {
  try {
    if (originalBoosted) {
      console.log(
        "Already boosted — skipping"
      )
    } else if (isBoosted) {
      const { error: boostError } =
        await supabase.rpc(
          "boost_listing",
          {
            listing_id: id,
            user_id: session.user.id,
          }
        )

      if (boostError) {
        console.warn(
          "Boost failed:",
          boostError.message
        )
      }
    }
  } catch (err) {
    console.warn("Boost RPC error:", err)
  }
}

      Alert.alert(
        "Success",
        "Listing updated successfully!"
      )
      router.back()
    } catch (err) {
      handleAppError(err, {
        context: "update_listing",
        fallbackMessage:
          "Failed to update listing.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const showAlreadyBoosted = () => {
    Alert.alert(
      "Already Boosted",
      "This listing is already boosted. Please wait until the boost period ends to boost again."
    )
  }

  if (checkingAddress || loadingListing) {
    return (
      <View style={styles.screen}>
        <GlobalHeader />
        <View style={styles.loaderWrap}>
          <ActivityIndicator
            size="large"
            color="#D97732"
          />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      {hasReturnAddress && (
        <ScrollView
          contentContainerStyle={styles.content}
        >
          <ImageUpload
  images={images}
  setImages={setImages}
  video={video || (existingVideoUrl ? { uri: existingVideoUrl } : null)}
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
    CONDITIONS.find(
      (c) => c.value === condition
    )?.subtext || ""
  }
  onPressCategory={() =>
    setShowCategoryModal(true)
  }
  onPressSubcategory={() =>
    setShowSubcategoryModal(true)
  }
  onPressCondition={() =>
    setShowConditionModal(true)
  }
  sizes={sizes}
  setSizes={setSizes}
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

          <SKUInput
  value={sku}
  onChange={setSku}
/>

          <CreateListingBoost
  selectedBoost={
    isBoosted
      ? "boost"
      : "none"
  }
  setSelectedBoost={(val) => {
    if (originalBoosted) {
      showAlreadyBoosted()
      return
    }

    setIsBoosted(
      val === "boost"
    )
  }}
  boostCredits={boostsRemaining}
  onBuyCredits={() =>
    router.push("/boostcredits")
  }
  onPublish={handleUpdateListing}
  submitting={submitting}
/>
        </ScrollView>
      )}

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
        onClose={() =>
          setShowCategoryModal(false)
        }
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
        onClose={() =>
          setShowConditionModal(false)
        }
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
  onClose={() =>
    setShowSubcategoryModal(false)
  }
/>

      <ReturnAddressRequiredModal
        visible={showAddressModal}
        onClose={() =>
          setShowAddressModal(false)
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#e8e8e8",
  },

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
})