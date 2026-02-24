import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import { useState } from "react"
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

/* ---------------- CONSTANTS (UNCHANGED) ---------------- */

const CATEGORIES = [
  { label: "Hard Case", value: "hard_case" },
  { label: "Soft Case", value: "soft_case" },
  { label: "Custom Cue", value: "custom_cue" },
  { label: "Playing Cue", value: "playing_cue" },
  { label: "Break Cue", value: "break_cue" },
  { label: "Jump Cue", value: "jump_cue" },
  { label: "Other", value: "other" },
]

const CONDITIONS = [
  { label: "New", value: "new" },
  { label: "Like New", value: "like_new" },
  { label: "Good", value: "good" },
  { label: "Fair", value: "fair" },
  { label: "Poor", value: "poor" },
]

export default function CreateListingForm() {
  const router = useRouter()
  const { session } = useAuth()

  const [images, setImages] = useState<string[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [brand, setBrand] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [condition, setCondition] = useState<string | null>(null)
  const [price, setPrice] = useState("")

  const [allowOffers, setAllowOffers] = useState(false)
  const [minOffer, setMinOffer] = useState("")

  const [shippingType, setShippingType] =
    useState<"seller_pays" | "buyer_pays" | null>(null)
  const [shippingPrice, setShippingPrice] = useState("")

  const [submitting, setSubmitting] = useState(false)

  /* ---------------- IMAGE PICKER (UNCHANGED) ---------------- */

  const pickImage = async () => {
    try {
      if (images.length >= 5) {
        Alert.alert("Limit reached", "You can upload up to 5 images.")
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      })

      if (!result.canceled) {
        setImages((prev) => [...prev, result.assets[0].uri])
      }
    } catch (err) {
      handleAppError(err, {
        context: "create_listing_image_picker",
        fallbackMessage: "Failed to select image. Please try again.",
      })
    }
  }

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((i) => i !== uri))
  }

  /* ---------------- IMAGE UPLOAD (UNCHANGED) ---------------- */

  const uploadImage = async (
    uri: string,
    userId: string,
    listingId: string,
    index: number
  ) => {
    const ext = uri.split(".").pop() || "jpg"
    const path = `${userId}/${listingId}/${index}.${ext}`

    const formData = new FormData()
    formData.append("file", {
      uri,
      name: path,
      type: `image/${ext === "jpg" ? "jpeg" : ext}`,
    } as any)

    const { error } = await supabase.storage
      .from("listing-images")
      .upload(path, formData, { upsert: true })

    if (error) {
      handleAppError(error, {
        context: "create_listing_storage_upload",
        fallbackMessage: "Image upload failed. Please try again.",
      })
      throw error
    }

    const { data } = supabase.storage
      .from("listing-images")
      .getPublicUrl(path)

    return data.publicUrl
  }

  /* ---------------- SUBMIT (100% UNCHANGED LOGIC) ---------------- */

  const submit = async () => {
    if (!session?.user) {
      handleAppError(new Error("User session missing"), {
        context: "create_listing_no_session",
        fallbackMessage: "Your session expired. Please sign in again.",
      })
      return
    }

    const { data: returnAddress, error: addressError } = await supabase
      .from("seller_return_addresses")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle()

    if (addressError) {
      handleAppError(addressError, {
        context: "create_listing_check_return_address",
        fallbackMessage:
          "Unable to verify return address. Please try again.",
      })
      return
    }

    if (!returnAddress) {
      Alert.alert(
        "Return Address Required",
        "You must add a return address before creating listings."
      )
      router.push("../seller-hub/return-address")
      return
    }

    if (!title || !category || !condition || !price || images.length === 0) {
      Alert.alert("Missing info", "Please complete all required fields.")
      return
    }

    if (!shippingType) {
      Alert.alert("Shipping required", "Please select a shipping option.")
      return
    }

    if (shippingType === "buyer_pays") {
      const amount = Number(shippingPrice)
      if (!amount || amount <= 0) {
        Alert.alert(
          "Invalid shipping",
          "Enter a valid shipping amount for buyer-paid shipping."
        )
        return
      }
    }

    if (allowOffers && Number(minOffer) >= Number(price)) {
      Alert.alert("Invalid offer", "Minimum offer must be below price.")
      return
    }

    try {
      setSubmitting(true)

      const { data: listing, error } = await supabase
        .from("listings")
        .insert({
          user_id: session.user.id,
          title,
          description,
          brand,
          category,
          condition,
          price: Number(price),
          allow_offers: allowOffers,
          min_offer: allowOffers ? Number(minOffer) : null,
          shipping_type: shippingType,
          shipping_price:
            shippingType === "buyer_pays" ? Number(shippingPrice) : 0,
          image_urls: [],
        })
        .select()
        .single()

      if (error) throw error
      if (!listing) throw new Error("Listing creation failed")

      const urls: string[] = []
      for (let i = 0; i < images.length; i++) {
        const url = await uploadImage(
          images[i],
          session.user.id,
          listing.id,
          i
        )
        urls.push(url)
      }

      const { error: updateError } = await supabase
        .from("listings")
        .update({ image_urls: urls })
        .eq("id", listing.id)

      if (updateError) throw updateError

      Alert.alert("Success", "Listing created!")
      router.replace("/seller-hub")
    } catch (err: any) {
      handleAppError(err, {
        context: "create_listing_submit",
        fallbackMessage:
          "Failed to create listing. Please try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------------- UI (UNCHANGED) ---------------- */

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.label}>Photos *</Text>
      <View style={styles.imageRow}>
        {images.map((uri, i) => (
          <TouchableOpacity key={i} onPress={() => removeImage(uri)}>
            <Image source={{ uri }} style={styles.image} />
          </TouchableOpacity>
        ))}
        {images.length < 5 && (
          <TouchableOpacity style={styles.addImage} onPress={pickImage}>
            <Ionicons name="add" size={24} color="#7FAF9B" />
          </TouchableOpacity>
        )}
      </View>

      <Field label="Title *" value={title} onChange={setTitle} />
      <Field label="Description" value={description} onChange={setDescription} multiline />
      <Field label="Brand" value={brand} onChange={setBrand} />
      <Field label="Price *" value={price} onChange={setPrice} keyboardType="decimal-pad" />

      <Text style={styles.label}>Condition *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.pillRow}>
          {CONDITIONS.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[styles.pill, condition === c.value && styles.pillActive]}
              onPress={() => setCondition(c.value)}
            >
              <Text
                style={[
                  styles.pillText,
                  condition === c.value && styles.pillTextActive,
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.label}>Category *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.pillRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[styles.pill, category === c.value && styles.pillActive]}
              onPress={() => setCategory(c.value)}
            >
              <Text
                style={[
                  styles.pillText,
                  category === c.value && styles.pillTextActive,
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.label}>Shipping *</Text>

      <TouchableOpacity
        style={[
          styles.option,
          shippingType === "seller_pays" && styles.optionActive,
        ]}
        onPress={() => {
          setShippingType("seller_pays")
          setShippingPrice("")
        }}
      >
        <Text>Free Shipping (Seller Pays)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.option,
          shippingType === "buyer_pays" && styles.optionActive,
        ]}
        onPress={() => setShippingType("buyer_pays")}
      >
        <Text>Buyer Pays Shipping</Text>
      </TouchableOpacity>

      {shippingType === "buyer_pays" && (
        <Field
          label="Shipping Price *"
          value={shippingPrice}
          onChange={setShippingPrice}
          keyboardType="decimal-pad"
        />
      )}

      <View style={styles.toggleRow}>
        <Text style={styles.label}>Accept Offers</Text>
        <Switch value={allowOffers} onValueChange={setAllowOffers} />
      </View>

      {allowOffers && (
        <Field
          label="Minimum Offer"
          value={minOffer}
          onChange={setMinOffer}
          keyboardType="decimal-pad"
        />
      )}

      <TouchableOpacity
        style={styles.submit}
        onPress={submit}
        disabled={submitting}
      >
        <Text style={styles.submitText}>
          {submitting ? "Creating..." : "Create Listing"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function Field({
  label,
  value,
  onChange,
  multiline,
  keyboardType,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  keyboardType?: any
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholderTextColor="#9BB7AA"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 140,
  },
  fieldContainer: { marginBottom: 16 },
  label: { fontWeight: "700", marginBottom: 6, color: "#2E5F4F" },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#D6E6DE",
    color: "#1F3D33",
    fontSize: 15,
  },
  inputMultiline: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  imageRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  image: { width: 72, height: 72, borderRadius: 12 },
  addImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#7FAF9B",
    backgroundColor: "#F1F8F5",
    alignItems: "center",
    justifyContent: "center",
  },
  pillRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  pill: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: "#EAF4EF",
    borderWidth: 1,
    borderColor: "#D6E6DE",
  },
  pillActive: { backgroundColor: "#7FAF9B", borderColor: "#7FAF9B" },
  pillText: { color: "#2E5F4F", fontSize: 13, fontWeight: "500" },
  pillTextActive: { color: "#0F1E17", fontWeight: "700" },
  option: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#D6E6DE",
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  optionActive: { backgroundColor: "#EAF4EF", borderColor: "#7FAF9B" },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 14,
  },
  submit: {
    marginTop: 28,
    backgroundColor: "#0F1E17",
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.3,
  },
})
