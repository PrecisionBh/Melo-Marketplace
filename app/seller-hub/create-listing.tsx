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
import { useCallback, useState } from "react"
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
}

/* ---------------- SELECTOR DATA ---------------- */
const CATEGORIES = [
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
]

const CONDITIONS = [
  { label: "New", value: "new", subtext: "Brand new, unused, and in original condition." },
  { label: "Like New", value: "like_new", subtext: "Very lightly used with little to no visible wear." },
  { label: "Good", value: "good", subtext: "Used but well maintained. Minor cosmetic wear only." },
  { label: "Fair", value: "fair", subtext: "Noticeable wear, scratches, or cosmetic flaws." },
  { label: "Poor", value: "poor", subtext: "Heavy wear, damage, or needs repair." },
]

const BRANDS = [
  { label: "Precision", value: "precision" },
  { label: "Action", value: "action" },
  { label: "Aramith", value: "aramith" },
  { label: "Black Boar", value: "black_boar" },
  { label: "Bull Carbon", value: "bull_carbon" },
  { label: "Cuetec", value: "cuetec" },
  { label: "Dynasphere", value: "dynasphere" },
  { label: "Game-On Gear", value: "game_on_gear" },
  { label: "Hustle", value: "hustle" },
  { label: "JB Cases", value: "jb_cases" },
  { label: "Jacoby", value: "jacoby" },
  { label: "Kamui", value: "kamui" },
  { label: "Lucasi", value: "lucasi" },
  { label: "Masters", value: "masters" },
  { label: "McDermott", value: "mcdermott" },
  { label: "Mezz", value: "mezz" },
  { label: "Meucci", value: "meucci" },
  { label: "Pagulayan", value: "pagulayan" },
  { label: "Paragon", value: "paragon" },
  { label: "Pechauer", value: "pechauer" },
  { label: "Poison", value: "poison" },
  { label: "Predator", value: "predator" },
  { label: "Schon", value: "schon" },
  { label: "South West", value: "south_west" },
  { label: "Taom", value: "taom" },
  { label: "Viking", value: "viking" },
  { label: "Whyte Carbon", value: "whyte_carbon" },
  { label: "Custom", value: "custom" },
  { label: "Other", value: "other" },
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
  const [quantity, setQuantity] = useState("1")
  const [boostsRemaining, setBoostsRemaining] = useState<number>(0)

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

  /* ---------------- CREATE LISTING (FIXED QUANTITY + DB SAFE) ---------------- */
  const handleCreateListing = async () => {
    if (!session?.user) return
    if (submitting) return

    try {
      setSubmitting(true)

      const parsedPrice = parseFloat(price)
      const parsedMinOffer = minOffer ? parseFloat(minOffer) : null
      const parsedShippingPrice = shippingPrice ? parseFloat(shippingPrice) : 0

      // 🔒 HARD CLAMP: quantity must ALWAYS be >= 1
      const rawQty = parseInt(quantity, 10)
      const safeQuantity = isPro
        ? Math.max(1, Number.isFinite(rawQty) ? rawQty : 1)
        : 1

      if (isNaN(parsedPrice)) {
        Alert.alert("Invalid Price", "Please enter a valid price.")
        return
      }

      const { data, error } = await supabase
        .from("listings")
        .insert({
          user_id: session.user.id,
          title: title.trim(),
          description: description.trim() || null,
          brand: brand,
          category: category,
          condition: condition,
          price: parsedPrice,
          allow_offers: allowOffers,
          min_offer: allowOffers ? parsedMinOffer : null,
          shipping_type: shippingType,
          shipping_price: parsedShippingPrice,
          image_urls: images,

          // 🔥 CRITICAL: BOTH columns (min 1, never null)
          quantity: safeQuantity,
          quantity_available: safeQuantity,
        })
        .select("id")
        .single()

      if (error) throw error

      if (isPro && isBoosted && data?.id) {
        const { error: boostError } = await supabase.rpc("boost_listing", {
          listing_id: data.id,
          user_id: session.user.id,
        })

        if (boostError) {
          console.warn("Boost failed:", boostError.message)
          Alert.alert(
            "Listing Created",
            "Your listing was created but the boost could not be applied."
          )
        } else {
          const { data: updatedProfile } = await supabase
            .from("profiles")
            .select("boosts_remaining")
            .eq("id", session.user.id)
            .single()

          if (updatedProfile) {
            setBoostsRemaining(updatedProfile.boosts_remaining ?? 0)
          }
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
            .select("is_pro, boosts_remaining")
            .eq("id", session.user.id)
            .single<ProfileRow>()

          setIsPro(Boolean(profile?.is_pro))
          setBoostsRemaining(profile?.boosts_remaining ?? 0)
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
            category={category}
            brand={brand}
            condition={condition}
            onPressCategory={() => setShowCategoryModal(true)}
            onPressBrand={() => setShowBrandModal(true)}
            onPressCondition={() => setShowConditionModal(true)}
          />

          <View style={styles.sectionSpacing}>
            <ProFeaturesSection
              isPro={isPro}
              boostsRemaining={boostsRemaining}
              isBoosted={isBoosted}
              setIsBoosted={setIsBoosted}
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

      <FullScreenSelector
        visible={showCategoryModal}
        title="Select Category"
        options={CATEGORIES}
        selectedValue={category ?? undefined}
        onSelect={setCategory}
        onClose={() => setShowCategoryModal(false)}
      />

      <FullScreenSelector
        visible={showBrandModal}
        title="Select Brand"
        options={BRANDS}
        selectedValue={brand ?? undefined}
        onSelect={setBrand}
        onClose={() => setShowBrandModal(false)}
      />

      <FullScreenSelector
        visible={showConditionModal}
        title="Select Condition"
        options={CONDITIONS}
        selectedValue={condition ?? undefined}
        onSelect={setCondition}
        onClose={() => setShowConditionModal(false)}
      />

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