// app/create-listing.tsx
import AppHeader from "@/components/app-header"
import CategoryBrandConditionSection from "@/components/create-listing/CategoryBrandConditionSection"
import CreateListingFooter from "@/components/create-listing/CreateListingFooter"
import FullScreenSelector from "@/components/create-listing/FullScreenSelector"
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
import { useFocusEffect, useRouter } from "expo-router"
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
    { label: "Pechauer", value: "pechauer" },
    { label: "Jacoby", value: "jacoby" },
    { label: "Lucasi", value: "lucasi" },
    { label: "Mezz", value: "mezz" },
    { label: "Schon", value: "schon" },
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
    { label: "Marucci", value: "marucci" },
    { label: "DeMarini", value: "demarini" },
    { label: "Other", value: "other" },
  ],

  basketball: [
    { label: "Nike", value: "nike" },
    { label: "Adidas", value: "adidas" },
    { label: "Jordan", value: "jordan" },
    { label: "Under Armour", value: "under_armour" },
    { label: "Wilson", value: "wilson" },
    { label: "Spalding", value: "spalding" },
    { label: "Molten", value: "molten" },
    { label: "Other", value: "other" },
  ],

  football: [
    { label: "Nike", value: "nike" },
    { label: "Adidas", value: "adidas" },
    { label: "Under Armour", value: "under_armour" },
    { label: "Riddell", value: "riddell" },
    { label: "Schutt", value: "schutt" },
    { label: "Wilson", value: "wilson" },
    { label: "Xenith", value: "xenith" },
    { label: "Other", value: "other" },
  ],

  soccer: [
    { label: "Nike", value: "nike" },
    { label: "Adidas", value: "adidas" },
    { label: "Puma", value: "puma" },
    { label: "Umbro", value: "umbro" },
    { label: "New Balance", value: "new_balance" },
    { label: "Mizuno", value: "mizuno" },
    { label: "Other", value: "other" },
  ],

  fitness: [
    { label: "Bowflex", value: "bowflex" },
    { label: "NordicTrack", value: "nordictrack" },
    { label: "Peloton", value: "peloton" },
    { label: "Rogue Fitness", value: "rogue" },
    { label: "Titan Fitness", value: "titan_fitness" },
    { label: "CAP Barbell", value: "cap_barbell" },
    { label: "Life Fitness", value: "life_fitness" },
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
    { label: "Latitude 64", value: "latitude_64" },
    { label: "Other", value: "other" },
  ],

  bowling: [
    { label: "Storm", value: "storm" },
    { label: "Brunswick", value: "brunswick" },
    { label: "Hammer", value: "hammer" },
    { label: "Ebonite", value: "ebonite" },
    { label: "Motiv", value: "motiv" },
    { label: "Other", value: "other" },
  ],
}

//conditions//

const CONDITIONS: SelectorOption[] = [
  { label: "New", value: "new", subtext: "Brand new, unused, and in original condition." },
  { label: "Like New", value: "like_new", subtext: "Very lightly used with little to no visible wear." },
  { label: "Good", value: "good", subtext: "Used but well maintained. Minor cosmetic wear only." },
  { label: "Fair", value: "fair", subtext: "Noticeable wear, scratches, or cosmetic flaws." },
  { label: "Poor", value: "poor", subtext: "Heavy wear, damage, or needs repair." },
]

export default function CreateListingScreen() {
  const { session } = useAuth()
  const router = useRouter()

  const [images, setImages] = useState<string[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [brand, setBrand] = useState<string | null>(null)
  const [condition, setCondition] = useState<string | null>(null)

  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showBrandModal, setShowBrandModal] = useState(false)
  const [showConditionModal, setShowConditionModal] = useState(false)

  const [isBoosted, setIsBoosted] = useState(false)
  const [isMegaBoosted, setIsMegaBoosted] = useState(false) // 👑 NEW
  const [quantity, setQuantity] = useState("1")
  const [boostsRemaining, setBoostsRemaining] = useState<number>(0)
  const [megaBoostsRemaining, setMegaBoostsRemaining] = useState<number>(0) // 👑 NEW

  const [shippingType, setShippingType] =
    useState<"seller_pays" | "buyer_pays" | null>(null)
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

  const [sportType, setSportType] = useState<string | null>("billiards")
  const [showSportModal, setShowSportModal] = useState(false)

  const categoriesForSport =
  sportType && SPORT_CATEGORY_MAP[sportType]
    ? SPORT_CATEGORY_MAP[sportType]
    : []

const brandsForSport =
  sportType && SPORT_BRAND_MAP[sportType]
    ? SPORT_BRAND_MAP[sportType]
    : []

/* ---------------- RESET CATEGORY + BRAND WHEN SPORT CHANGES ---------------- */

useEffect(() => {
  setCategory(null)
  setBrand(null)
}, [sportType])

const handleCreateListing = async () => {
  if (!session?.user) return
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

    /* ---------------- INSERT LISTING ---------------- */

    const { data, error } = await supabase
      .from("listings")
      .insert({
  user_id: session.user.id,
  title: title.trim(),
  description: description.trim() || null,
  sport_type: sportType,
  brand: brand,
  category: category,
  condition: condition,
  price: parsedPrice,
  allow_offers: allowOffers,
  min_offer: allowOffers ? parsedMinOffer : null,
  shipping_type: shippingType,
  shipping_price: parsedShippingPrice,
  image_urls: uploadedImageUrls,
  quantity: safeQuantity,
  quantity_available: safeQuantity,
})
      .select("id")
      .single()

    if (error) throw error

   /* ---------------- BOOST LOGIC ---------------- */

if (isPro && data?.id) {
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
router.replace("/seller-hub")
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

      const { data: addressData } = await supabase
        .from("seller_return_addresses")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle()

      setHasReturnAddress(!!addressData)
      setShowAddressModal(!addressData)

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_pro, boosts_remaining, mega_boosts_remaining")
        .eq("id", session.user.id)
        .single<ProfileRow>()

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

if (checkingAddress) {
return (
  <View style={styles.screen}>
    <AppHeader title="Create Listing" backRoute="/seller-hub" />
    <View style={styles.loaderWrap}>
      <ActivityIndicator size="large" color="#7FAF9B" />
    </View>
  </View>
)
}

return (
<View style={styles.screen}>
  <AppHeader title="Create Listing" backRoute="/seller-hub" />

  {!checkingPro && !isPro && (
    <UpgradeToProButton
      style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 4 }}
    />
  )}

  {hasReturnAddress && (
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
          onSubmit={handleCreateListing}
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
  )}

  {/* SPORT SELECTOR */}
  <FullScreenSelector
    visible={showSportModal}
    title="Select Sport"
    options={SPORT_TYPES}
    selectedValue={sportType ?? undefined}
    onSelect={setSportType}
    onClose={() => setShowSportModal(false)}
  />

{/* CATEGORY SELECTOR */}
<FullScreenSelector
  visible={showCategoryModal}
  title="Select Category"
  options={categoriesForSport}
  selectedValue={category ?? undefined}
  onSelect={(value) => {
    setCategory(value)
    setShowCategoryModal(false)
  }}
  onClose={() => setShowCategoryModal(false)}
/>

{/* BRAND SELECTOR */}
<FullScreenSelector
  visible={showBrandModal}
  title="Select Brand"
  options={brandsForSport}
  selectedValue={brand ?? undefined}
  onSelect={(value) => {
    setBrand(value)
    setShowBrandModal(false)
  }}
  onClose={() => setShowBrandModal(false)}
/>

  {/* CONDITION SELECTOR */}
  <FullScreenSelector
    visible={showConditionModal}
    title="Select Condition"
    options={CONDITIONS}
    selectedValue={condition ?? undefined}
    onSelect={setCondition}
    onClose={() => setShowConditionModal(false)}
  />

  {/* FREE TIER LIMIT MODAL */}
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
          <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
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
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 140 },
  sectionSpacing: { marginTop: 18 },

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
  
})