import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
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

import { useAuth } from "../../context/AuthContext"
import { supabase } from "../../lib/supabase"

/* ---------------- CONSTANTS ---------------- */

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

const BUYER_SHIPPING_FEE = 15

/* ---------------- SCREEN ---------------- */

export default function EditListing() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

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
    useState<"free" | "buyer_pays" | null>(null)

  /* ---------------- LOAD LISTING ---------------- */

  useEffect(() => {
    if (id) loadListing()
  }, [id])

  const loadListing = async () => {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data) {
      Alert.alert("Error", "Listing not found")
      router.back()
      return
    }

    setTitle(data.title)
    setDescription(data.description ?? "")
    setBrand(data.brand ?? "")
    setCategory(data.category)
    setCondition(data.condition)
    setPrice(String(data.price))
    setAllowOffers(data.allow_offers)
    setMinOffer(data.min_offer ? String(data.min_offer) : "")
    setShippingType(data.shipping_type)
    setImages(data.image_urls ?? [])

    setLoading(false)
  }

  /* ---------------- IMAGE PICKER ---------------- */

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert("Limit reached", "Max 5 images allowed")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    })

    if (!result.canceled) {
      setImages((prev) => [...prev, result.assets[0].uri])
    }
  }

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((i) => i !== uri))
  }

  /* ---------------- IMAGE UPLOAD ---------------- */

  const uploadImage = async (
    uri: string,
    userId: string,
    listingId: string,
    index: number
  ) => {
    if (uri.startsWith("http")) return uri

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

    if (error) throw error

    const { data } = supabase.storage
      .from("listing-images")
      .getPublicUrl(path)

    return data.publicUrl
  }

  /* ---------------- SUBMIT ---------------- */

  const submit = async () => {
    if (!session?.user || !id) return

    if (!title || !category || !condition || !price || images.length === 0) {
      Alert.alert("Missing info", "Please complete all required fields.")
      return
    }

    if (!shippingType) {
      Alert.alert("Shipping required", "Select a shipping option.")
      return
    }

    if (allowOffers && Number(minOffer) >= Number(price)) {
      Alert.alert("Invalid offer", "Minimum offer must be below price.")
      return
    }

    try {
      setSubmitting(true)

      const finalImages: string[] = []

      for (let i = 0; i < images.length; i++) {
        const url = await uploadImage(
          images[i],
          session.user.id,
          id,
          i
        )
        finalImages.push(url)
      }

      await supabase
        .from("listings")
        .update({
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
            shippingType === "buyer_pays" ? BUYER_SHIPPING_FEE : 0,
          image_urls: finalImages,
        })
        .eq("id", id)

      Alert.alert("Saved", "Listing updated")
      router.back()
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Update failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Listing</Text>
        <View style={{ width: 22 }} />
      </View>

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

        {/* CONDITION */}
        <Text style={styles.label}>Condition *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.pillRow}>
            {CONDITIONS.map((c) => (
              <TouchableOpacity
                key={c.value}
                style={[
                  styles.pill,
                  condition === c.value ? styles.pillActive : undefined,
                ]}
                onPress={() => setCondition(c.value)}
              >
                <Text
                  style={[
                    styles.pillText,
                    condition === c.value ? styles.pillTextActive : undefined,
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* CATEGORY */}
        <Text style={styles.label}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.pillRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.value}
                style={[
                  styles.pill,
                  category === c.value ? styles.pillActive : undefined,
                ]}
                onPress={() => setCategory(c.value)}
              >
                <Text
                  style={[
                    styles.pillText,
                    category === c.value ? styles.pillTextActive : undefined,
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* SHIPPING */}
        <Text style={styles.label}>Shipping *</Text>
        <TouchableOpacity
          style={[
            styles.option,
            shippingType === "free" ? styles.optionActive : undefined,
          ]}
          onPress={() => setShippingType("free")}
        >
          <Text>Free Shipping</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.option,
            shippingType === "buyer_pays" ? styles.optionActive : undefined,
          ]}
          onPress={() => setShippingType("buyer_pays")}
        >
          <Text>Buyer Pays Shipping ($15)</Text>
        </TouchableOpacity>

        {/* OFFERS */}
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

        <TouchableOpacity style={styles.submit} onPress={submit}>
          <Text style={styles.submitText}>
            {submitting ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

/* ---------------- FIELD ---------------- */

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
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline ? { height: 90 } : undefined]}
      />
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  topBar: {
    paddingTop: 50,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  content: {
    padding: 16,
    paddingBottom: 140,
  },

  label: {
    fontWeight: "700",
    marginBottom: 6,
    color: "#2E5F4F",
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D6E6DE",
    color: "#2E5F4F",
  },

  imageRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  image: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },

  addImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#7FAF9B",
    alignItems: "center",
    justifyContent: "center",
  },

  pillRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#EAF4EF",
  },

  pillActive: {
    backgroundColor: "#7FAF9B",
  },

  pillText: {
    color: "#2E5F4F",
    fontSize: 13,
  },

  pillTextActive: {
    color: "#0F1E17",
    fontWeight: "700",
  },

  option: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#D6E6DE",
    borderRadius: 10,
    marginBottom: 8,
  },

  optionActive: {
    backgroundColor: "#EAF4EF",
    borderColor: "#7FAF9B",
  },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },

  submit: {
    marginTop: 24,
    backgroundColor: "#0F1E17",
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  submitText: {
    color: "#fff",
    fontWeight: "900",
  },
})
