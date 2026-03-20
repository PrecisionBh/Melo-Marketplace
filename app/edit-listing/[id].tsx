// app/edit-listing.tsx (IDENTICAL UI TO CREATE LISTING — EDIT MODE)

import AppHeader from "@/components/app-header"
import CategoryBrandConditionSection from "@/components/create-listing/CategoryBrandConditionSection"
import CreateListingFooter from "@/components/create-listing/CreateListingFooter"
import ImageUpload from "@/components/create-listing/ImageUpload"
import PriceOffersSection from "@/components/create-listing/PriceOffersSection"
import ProFeaturesSection from "@/components/create-listing/ProFeaturesSection"
import ShippingSection from "@/components/create-listing/ShippingSection"
import TitleDescriptionSection from "@/components/create-listing/TitleDescriptionSection"
import ReturnAddressRequiredModal from "@/components/modals/ReturnAddressRequiredModal"
import UpgradeToProButton from "@/components/pro/UpgradeToProButton"
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
  is_pro: boolean | null
  boosts_remaining: number | null
  mega_boosts_remaining: number | null
}

type SelectorOption = {
  label: string
  value: string
  subtext?: string
}

/* ---------------- SPORT TYPES ---------------- */

const SPORT_TYPES: SelectorOption[] = [
  { label: "Billiards", value: "billiards" },
  { label: "Golf", value: "golf" },
  { label: "Baseball / Softball", value: "baseball_softball" },
  { label: "Cornhole", value: "cornhole" },
  { label: "Darts", value: "darts" },
  { label: "Disc Golf", value: "disc_golf" },
  { label: "Bowling", value: "bowling" },
]

/* ---------------- SPORT → CATEGORY MAP ---------------- */

const SPORT_CATEGORY_MAP: Record<string, SelectorOption[]> = {
  billiards: [
    { label: "Playing Cues", value: "playing_cue" },
    { label: "Custom Cues", value: "custom_cue" },
    { label: "Break Cues", value: "break_cue" },
    { label: "Jump Cues", value: "jump_cue" },
    { label: "Shafts", value: "shaft" },
    { label: "Cue Cases", value: "case" },
    { label: "Chalk", value: "chalk" },
    { label: "Gloves", value: "gloves" },
    { label: "Apparel", value: "apparel" },
    { label: "Accessories", value: "accessories" },
    { label: "Collectibles", value: "collectibles" },
    { label: "Other", value: "other" },
  ],

  golf: [
    { label: "Drivers", value: "drivers" },
    { label: "Irons", value: "irons" },
    { label: "Putters", value: "putters" },
    { label: "Golf Bags", value: "golf_bags" },
    { label: "Golf Balls", value: "golf_balls" },
    { label: "Accessories", value: "golf_accessories" },
  ],

  baseball_softball: [
    { label: "Bats", value: "bats" },
    { label: "Gloves", value: "gloves" },
    { label: "Cleats", value: "cleats" },
    { label: "Helmets", value: "helmets" },
    { label: "Accessories", value: "accessories" },
  ],

  cornhole: [
    { label: "Cornhole Bags", value: "cornhole_bags" },
    { label: "Boards", value: "cornhole_boards" },
    { label: "Board Sets", value: "cornhole_sets" },
    { label: "Jerseys", value: "cornhole_jerseys" },
    { label: "Accessories", value: "cornhole_accessories" },
  ],

  darts: [
    { label: "Steel Tip Darts", value: "steel_tip_darts" },
    { label: "Soft Tip Darts", value: "soft_tip_darts" },
    { label: "Dart Boards", value: "dart_boards" },
    { label: "Flights", value: "dart_flights" },
    { label: "Shafts", value: "dart_shafts" },
    { label: "Cases", value: "dart_cases" },
  ],

  disc_golf: [
    { label: "Drivers", value: "disc_drivers" },
    { label: "Midrange Discs", value: "midrange_discs" },
    { label: "Putters", value: "disc_putters" },
    { label: "Disc Bags", value: "disc_bags" },
    { label: "Accessories", value: "disc_accessories" },
  ],

  bowling: [
    { label: "Bowling Balls", value: "bowling_balls" },
    { label: "Bowling Bags", value: "bowling_bags" },
    { label: "Shoes", value: "bowling_shoes" },
    { label: "Accessories", value: "bowling_accessories" },
  ],
}

/* ---------------- SPORT → BRAND MAP ---------------- */

const SPORT_BRAND_MAP: Record<string, SelectorOption[]> = {
  billiards: [
    { label: "Precision", value: "precision" },
    { label: "Predator", value: "predator" },
    { label: "Cuetec", value: "cuetec" },
    { label: "McDermott", value: "mcdermott" },
    { label: "Meucci", value: "meucci" },
    { label: "Jacoby", value: "jacoby" },
    { label: "Schon", value: "schon" },
    { label: "Mezz", value: "mezz" },
    { label: "Viking", value: "viking" },
    { label: "Other", value: "other" },
  ],

  golf: [
    { label: "Titleist", value: "titleist" },
    { label: "Callaway", value: "callaway" },
    { label: "TaylorMade", value: "taylormade" },
    { label: "Ping", value: "ping" },
    { label: "Cobra", value: "cobra" },
    { label: "Other", value: "other" },
  ],

  baseball_softball: [
    { label: "Easton", value: "easton" },
    { label: "Rawlings", value: "rawlings" },
    { label: "Louisville Slugger", value: "louisville_slugger" },
    { label: "Wilson", value: "wilson" },
    { label: "Other", value: "other" },
  ],

  cornhole: [
    { label: "AllCornhole", value: "allcornhole" },
    { label: "BG Bags", value: "bg_bags" },
    { label: "Reynolds Bags", value: "reynolds_bags" },
    { label: "Ultra Bags", value: "ultra_bags" },
    { label: "Other", value: "other" },
  ],

  darts: [
    { label: "Winmau", value: "winmau" },
    { label: "Target", value: "target" },
    { label: "Harrows", value: "harrows" },
    { label: "Red Dragon", value: "red_dragon" },
    { label: "Other", value: "other" },
  ],

  disc_golf: [
    { label: "Innova", value: "innova" },
    { label: "Discraft", value: "discraft" },
    { label: "Dynamic Discs", value: "dynamic_discs" },
    { label: "MVP", value: "mvp" },
    { label: "Other", value: "other" },
  ],

  bowling: [
    { label: "Storm", value: "storm" },
    { label: "Brunswick", value: "brunswick" },
    { label: "Hammer", value: "hammer" },
    { label: "Ebonite", value: "ebonite" },
    { label: "Other", value: "other" },
  ],
}

/* ---------------- CONDITIONS ---------------- */

const CONDITIONS: SelectorOption[] = [
  { label: "New", value: "new", subtext: "Brand new, unused, and in original condition." },
  { label: "Like New", value: "like_new", subtext: "Very lightly used with little to no visible wear." },
  { label: "Good", value: "good", subtext: "Used but well maintained. Minor cosmetic wear only." },
  { label: "Fair", value: "fair", subtext: "Noticeable wear, scratches, or cosmetic flaws." },
  { label: "Poor", value: "poor", subtext: "Heavy wear, damage, or needs repair." },
]

/* ---------------- MAIN SCREEN ---------------- */

export default function EditListingScreen() {

  const { session } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams()
const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [loadingListing, setLoadingListing] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [images, setImages] = useState<string[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [sportType, setSportType] = useState<string | null>("billiards")
  const [category, setCategory] = useState<string | null>(null)
  const [brand, setBrand] = useState<string | null>(null)
  const [condition, setCondition] = useState<string | null>(null)

  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showBrandModal, setShowBrandModal] = useState(false)
  const [showConditionModal, setShowConditionModal] = useState(false)
  const [showSportModal, setShowSportModal] = useState(false)

  const [isBoosted, setIsBoosted] = useState(false)
  const [isMegaBoosted, setIsMegaBoosted] = useState(false)

  const [quantity, setQuantity] = useState("1")

  const [boostsRemaining, setBoostsRemaining] = useState(0)
  const [megaBoostsRemaining, setMegaBoostsRemaining] = useState(0)

  const [shippingType, setShippingType] =
    useState<"seller_pays" | "buyer_pays" | null>(null)

  const [shippingPrice, setShippingPrice] = useState("")

  const [price, setPrice] = useState("")
  const [allowOffers, setAllowOffers] = useState(false)
  const [minOffer, setMinOffer] = useState("")

  const [checkingAddress, setCheckingAddress] = useState(true)
  const [hasReturnAddress, setHasReturnAddress] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)

  const [checkingPro, setCheckingPro] = useState(true)
  const [isPro, setIsPro] = useState(false)

  const categoriesForSport =
    sportType && SPORT_CATEGORY_MAP[sportType]
      ? SPORT_CATEGORY_MAP[sportType]
      : []

  const brandsForSport =
    sportType && SPORT_BRAND_MAP[sportType]
      ? SPORT_BRAND_MAP[sportType]
      : []

  useEffect(() => {
    setCategory(null)
    setBrand(null)
  }, [sportType])

 /* ---------------- LOAD LISTING ---------------- */

useEffect(() => {
  if (id) loadListing()
}, [id])

useEffect(() => {
  const loadGuards = async () => {
    if (!session?.user) {
      setCheckingAddress(false)
      setCheckingPro(false)
      return
    }

    try {
      setCheckingAddress(true)
      setCheckingPro(true)

      // ✅ MATCH CREATE LISTING (FIX)
      const { data: addressData } = await supabase
        .from("seller_return_addresses")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle()

      setHasReturnAddress(!!addressData)
      setShowAddressModal(!addressData)

      // ✅ PRO DATA
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_pro, boosts_remaining, mega_boosts_remaining")
        .eq("id", session.user.id)
        .single()

      setIsPro(!!profile?.is_pro)
      setBoostsRemaining(profile?.boosts_remaining ?? 0)
      setMegaBoostsRemaining(profile?.mega_boosts_remaining ?? 0)

    } catch (err) {
      console.log("Edit guard error:", err)

      // fallback (prevents blank screen)
      setHasReturnAddress(false)
      setShowAddressModal(true)
      setIsPro(false)
      setBoostsRemaining(0)
      setMegaBoostsRemaining(0)

    } finally {
      setCheckingAddress(false)
      setCheckingPro(false)
    }
  }

  loadGuards()
}, [session?.user?.id])

const loadListing = async () => {
  try {
    setLoadingListing(true)

    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data) throw error

    setTitle(data.title ?? "")
    setDescription(data.description ?? "")
    setSportType(data.sport_type ?? "billiards")
    setBrand(data.brand ?? null)
    setCategory(data.category ?? null)
    setCondition(data.condition ?? null)

    setPrice(data.price ? String(data.price) : "")
    setAllowOffers(!!data.allow_offers)
    setMinOffer(data.min_offer ? String(data.min_offer) : "")

    setShippingType(data.shipping_type ?? null)
    setShippingPrice(data.shipping_price ? String(data.shipping_price) : "")

    setImages(data.image_urls ?? [])

    setIsBoosted(Boolean(data.is_boosted))
    setIsMegaBoosted(Boolean(data.is_mega_boost))

    const safeLoadedQty =
      data.quantity && data.quantity > 0 ? data.quantity : 1

    setQuantity(String(safeLoadedQty))

  } catch (err) {
    handleAppError(err, {
      fallbackMessage: "Failed to load listing.",
    })

    router.back()

  } finally {
    setLoadingListing(false)
  }
}

/* ---------------- UPDATE LISTING ---------------- */

const handleUpdateListing = async () => {
  if (!session?.user || !id || submitting) return

  try {
    setSubmitting(true)

    const parsedPrice = parseFloat(price)
    const parsedMinOffer = minOffer ? parseFloat(minOffer) : null
    const parsedShippingPrice = shippingPrice ? parseFloat(shippingPrice) : 0

    const rawQty = parseInt(quantity, 10)
    const safeQuantity = isPro
      ? Math.max(1, Number.isFinite(rawQty) ? rawQty : 1)
      : 1

    if (isNaN(parsedPrice)) {
      Alert.alert("Invalid Price", "Please enter a valid price.")
      return
    }

    const uploadedImageUrls: string[] = []

    for (const uri of images) {
      if (uri.startsWith("http")) {
        uploadedImageUrls.push(uri)
        continue
      }

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

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from("listing-images")
        .getPublicUrl(fileName)

      uploadedImageUrls.push(data.publicUrl)
    }

    const updatePayload: any = {
      title: title.trim(),
      description: description.trim() || null,
      sport_type: sportType,
      brand,
      category,
      condition,
      price: parsedPrice,
      allow_offers: allowOffers,
      min_offer: allowOffers ? parsedMinOffer : null,
      shipping_type: shippingType,
      shipping_price: parsedShippingPrice,
      image_urls: uploadedImageUrls,
      quantity: safeQuantity,
      quantity_available: safeQuantity,
    }

    const { error } = await supabase
      .from("listings")
      .update(updatePayload)
      .eq("id", id)

    if (error) throw error

    Alert.alert("Success", "Listing updated successfully!")
    router.back()

  } catch (err) {
    handleAppError(err, {
      context: "update_listing",
      fallbackMessage: "Failed to update listing.",
    })

  } finally {
    setSubmitting(false)
  }
}

/* ---------------- LOADING ---------------- */

if (checkingAddress || loadingListing) {
  return (
    <View style={styles.screen}>
      <AppHeader title="Edit Listing" backRoute="/seller-hub" />
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#7FAF9B" />
      </View>
    </View>
  )
}

/* ---------------- UI ---------------- */

return (
  <View style={styles.screen}>
    <AppHeader title="Edit Listing" backRoute="/seller-hub" />

    {!checkingPro && !isPro && (
      <UpgradeToProButton
        style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 4 }}
      />
    )}

    <ScrollView contentContainerStyle={styles.content}>
      <ImageUpload images={images} setImages={setImages} max={5} />

      <TitleDescriptionSection
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
      />

      <CategoryBrandConditionSection
        sportType={sportType}
        category={category}
        brand={brand}
        condition={condition}
        onPressSportType={() => setShowSportModal(true)}
        onPressCategory={() => setShowCategoryModal(true)}
        onPressBrand={() => setShowBrandModal(true)}
        onPressCondition={() => setShowConditionModal(true)}
      />

      <View style={styles.sectionSpacing}>
        <ProFeaturesSection
          isPro={isPro}
          boostsRemaining={boostsRemaining}
          megaBoostsRemaining={megaBoostsRemaining}
          isBoosted={isBoosted}
          setIsBoosted={(val: boolean) => {
            setIsBoosted(val)
            if (val) setIsMegaBoosted(false)
          }}
          isMegaBoosted={isMegaBoosted}
          setIsMegaBoosted={(val: boolean) => {
            setIsMegaBoosted(val)
            if (val) setIsBoosted(false)
          }}
          megaBoostDescription="Take over the home page in one listing."
          quantity={quantity}
          setQuantity={setQuantity}
        />
      </View>

      <View style={styles.sectionSpacing}>
        <ShippingSection
          shippingType={shippingType}
          setShippingType={setShippingType}
          shippingPrice={shippingPrice}
          setShippingPrice={setShippingPrice}
        />
      </View>

      <View style={styles.sectionSpacing}>
        <PriceOffersSection
          price={price}
          setPrice={setPrice}
          allowOffers={allowOffers}
          setAllowOffers={setAllowOffers}
          minOffer={minOffer}
          setMinOffer={setMinOffer}
        />
      </View>

      <View style={styles.sectionSpacing}>
        <CreateListingFooter
          submitting={submitting}
          onSubmit={handleUpdateListing}
          label="Update Listing"
          disabled={
            submitting ||
            !title ||
            !sportType ||
            !category ||
            !condition ||
            !price ||
            images.length === 0 ||
            (allowOffers && !minOffer) ||
            !shippingType
          }
        />
      </View>
    </ScrollView>

    <ReturnAddressRequiredModal
      visible={showAddressModal}
      onClose={() => setShowAddressModal(false)}
    />
  </View>
)
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#e8e8e8" },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 140 },
  sectionSpacing: { marginTop: 18 },
})