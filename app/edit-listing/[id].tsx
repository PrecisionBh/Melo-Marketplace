import CreateListingBoost from "@/components/create-listing/CreateListingBoost"
import CreateListingDetails from "@/components/create-listing/CreateListingDetails"
import CreateListingOffers from "@/components/create-listing/CreateListingOffers"
import CreateListingSelectors from "@/components/create-listing/CreateListingSelectors"
import CreateListingShipping from "@/components/create-listing/CreateListingShipping"
import FullScreenSelector from "@/components/create-listing/FullScreenSelector"
import ImageUpload from "@/components/create-listing/ImageUpload"

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
  is_pro: boolean | null
  boosts_remaining: number | null
  mega_boosts_remaining?: number | null
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
  condition: string | null
  image_urls: string[] | null
  allow_offers: boolean | null
  min_offer: number | null
  shipping_type: "seller_pays" | "buyer_pays" | null
  shipping_price: number | null
  quantity: number | null
  quantity_available: number | null
  is_boosted: boolean | null
  is_mega_boost: boolean | null
  size: string | null
}

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
  const [title, setTitle] = useState("")
  const [description, setDescription] =
    useState("")
  const [category, setCategory] = useState<
    string | null
  >(null)
  const [condition, setCondition] = useState<
    string | null
  >(null)

  const [showCategoryModal, setShowCategoryModal] =
    useState(false)
  const [showConditionModal, setShowConditionModal] =
    useState(false)

  const [isBoosted, setIsBoosted] =
    useState(false)
  const [isMegaBoosted, setIsMegaBoosted] =
    useState(false)
  const [originalBoosted, setOriginalBoosted] =
    useState(false)
  const [
    originalMegaBoosted,
    setOriginalMegaBoosted,
  ] = useState(false)

  const [quantity, setQuantity] = useState("1")
  const [size, setSize] = useState<string | null>(null)
  const [boostsRemaining, setBoostsRemaining] =
    useState<number>(0)
  const [megaBoostsRemaining, setMegaBoostsRemaining] =
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

  const [isPro, setIsPro] = useState(false)

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

        const { data: addressData } = await supabase
          .from("seller_return_addresses")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle()

        setHasReturnAddress(!!addressData)
        setShowAddressModal(!addressData)

        const { data: profile } = await supabase
          .from("profiles")
          .select(
            "is_pro, boosts_remaining, mega_boosts_remaining"
          )
          .eq("id", session.user.id)
          .single<ProfileRow>()

        setIsPro(Boolean(profile?.is_pro))
        setBoostsRemaining(
          profile?.boosts_remaining ?? 0
        )
        setMegaBoostsRemaining(
          profile?.mega_boosts_remaining ?? 0
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

const safeCategory =
  data.category === "fashion"
    ? "clothing_apparel"
    : data.category

setCategory(safeCategory ?? null)

setCondition(data.condition ?? null)
setSize(data.size || null)

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

      const safeLoadedQty =
        data.quantity_available && data.quantity_available > 0
          ? data.quantity_available
          : data.quantity && data.quantity > 0
          ? data.quantity
          : 1

      setQuantity(String(safeLoadedQty))

      setIsBoosted(Boolean(data.is_boosted))
      setIsMegaBoosted(Boolean(data.is_mega_boost))
      setOriginalBoosted(Boolean(data.is_boosted))
      setOriginalMegaBoosted(
        Boolean(data.is_mega_boost)
      )
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
      const safeQuantity = isPro
        ? Math.max(
            1,
            Number.isFinite(rawQty) ? rawQty : 1
          )
        : 1

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

      const updatePayload = {
        title: title.trim(),
        description: description.trim() || null,
        brand: null,
        category,
        condition,
        size: category === "clothing_apparel" ? size : null,
        price: parsedPrice,
        allow_offers: allowOffers,
        min_offer: allowOffers
          ? parsedMinOffer
          : null,
        shipping_type: shippingType,
        shipping_price: parsedShippingPrice,
        image_urls: uploadedImageUrls,
        quantity: safeQuantity,
        quantity_available: safeQuantity,
        boost_locked:
          isBoosted || isMegaBoosted ? false : true,
      }

      const { error } = await supabase
        .from("listings")
        .update(updatePayload)
        .eq("id", id)

      if (error) throw error

      if (id) {
        try {
          if (
            originalBoosted ||
            originalMegaBoosted
          ) {
            console.log(
              "Already boosted — skipping"
            )
          } else if (isMegaBoosted) {
            const { error: megaError } =
              await supabase.rpc(
                "mega_boost_listing",
                {
                  listing_id: id,
                  user_id: session.user.id,
                }
              )

            if (megaError) {
              console.warn(
                "Mega Boost failed:",
                megaError.message
              )
            }
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
    CONDITIONS.find(
      (c) => c.value === condition
    )?.subtext || ""
  }
  onPressCategory={() =>
    setShowCategoryModal(true)
  }
  onPressCondition={() =>
    setShowConditionModal(true)
  }

  size={size}
  setSize={setSize}

  quantity={quantity}
  setQuantity={setQuantity}
  isPro={isPro}
/>

          <CreateListingShipping
            shippingType={
              shippingType === "seller_pays"
                ? "free"
                : "buyer_pays"
            }
            setShippingType={(val) =>
              setShippingType(
                val === "free"
                  ? "seller_pays"
                  : "buyer_pays"
              )
            }
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
              isMegaBoosted
                ? "mega"
                : isBoosted
                ? "boost"
                : "none"
            }
            setSelectedBoost={(val) => {
              if (
                originalBoosted ||
                originalMegaBoosted
              ) {
                showAlreadyBoosted()
                return
              }

              setIsBoosted(val === "boost")
              setIsMegaBoosted(val === "mega")
            }}
            boostCredits={boostsRemaining}
            megaCredits={megaBoostsRemaining}
            onBuyCredits={() =>
              router.push("/pro/packages")
            }
            onPublish={handleUpdateListing}
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