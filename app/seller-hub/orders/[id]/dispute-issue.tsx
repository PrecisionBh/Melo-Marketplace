import * as ImagePicker from "expo-image-picker"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"


type Dispute = {
  id: string
  order_id: string
  buyer_id: string
  seller_id: string
  reason: string
  description: string
  evidence_urls: string[] | null
  status: string
  seller_responded_at: string | null
}

export default function SellerDisputeIssue() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()
  const user = session?.user

  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [response, setResponse] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (id && user) {
      loadDispute()
    }
  }, [id, user])

  const loadDispute = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .eq("order_id", id)
        .single()

      if (error || !data) {
        Alert.alert("Dispute not found")
        router.back()
        return
      }

      if (data.seller_id !== user?.id) {
        Alert.alert("Access denied")
        router.back()
        return
      }

      setDispute(data)
    } catch (err) {
      console.error("Load dispute error:", err)
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- IMAGE PICKER ---------------- */

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    })

    if (!res.canceled && res.assets[0]?.uri) {
      setImages((prev) => [...prev, res.assets[0].uri])
    }
  }

  const uploadImages = async (): Promise<string[]> => {
    const uploaded: string[] = []

    for (const uri of images) {
      const fileName = `${dispute!.id}/seller/${Date.now()}.jpg`
      const file = await fetch(uri)
      const blob = await file.blob()

      const { error } = await supabase.storage
        .from("dispute-images")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
        })

      if (!error) {
        const { data } = supabase.storage
          .from("dispute-images")
          .getPublicUrl(fileName)

        uploaded.push(data.publicUrl)
      }
    }

    return uploaded
  }

  /* ---------------- SUBMIT ---------------- */

  const submitResponse = async () => {
    if (!response.trim()) {
      Alert.alert("Please enter a response")
      return
    }

    try {
      setSubmitting(true)

      const uploadedUrls = await uploadImages()

      await supabase
        .from("disputes")
        .update({
          seller_responded_at: new Date().toISOString(),
          status: "seller_responded", // ← correct lifecycle status
          evidence_urls: [
            ...(dispute?.evidence_urls ?? []),
            ...uploadedUrls,
          ],
        })
        .eq("order_id", dispute!.order_id)

      Alert.alert(
        "Response submitted",
        "Your response has been sent to review."
      )

      router.back()
    } catch (err) {
      console.error(err)
      Alert.alert("Error", "Unable to submit response.")
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!dispute) return null

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <AppHeader
  title="Dispute Response"
/>


      <ScrollView contentContainerStyle={styles.content}>
        {/* BUYER ISSUE */}
        <View style={styles.card}>
          <Text style={styles.label}>Buyer Issue</Text>
          <Text style={styles.reason}>{dispute.reason}</Text>
          <Text style={styles.description}>
            {dispute.description}
          </Text>
        </View>

        {/* BUYER EVIDENCE */}
        {dispute.evidence_urls?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidence</Text>
            <ScrollView horizontal>
              {dispute.evidence_urls.map((url) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={styles.image}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* SELLER RESPONSE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Response</Text>

          <TextInput
            style={styles.input}
            placeholder="Explain your side of the dispute..."
            multiline
            value={response}
            onChangeText={setResponse}
          />

          <TouchableOpacity
            style={styles.imageBtn}
            onPress={pickImage}
          >
            <Text style={styles.imageText}>
              Add Images / Screenshots
            </Text>
          </TouchableOpacity>

          <View style={styles.imageRow}>
            {images.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.thumb} />
            ))}
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            disabled={submitting}
            onPress={submitResponse}
          >
            <Text style={styles.submitText}>
              Submit Response
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F7F8" },

  content: { padding: 16, paddingBottom: 120 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },

  label: { fontWeight: "800", marginBottom: 6 },
  reason: { fontWeight: "900", fontSize: 16 },
  description: { marginTop: 8, color: "#444" },

  section: { marginTop: 24 },
  sectionTitle: { fontWeight: "800", marginBottom: 10 },

  input: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    minHeight: 120,
    textAlignVertical: "top",
  },

  imageBtn: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1F7A63",
    borderRadius: 12,
  },

  imageText: {
    textAlign: "center",
    fontWeight: "800",
    color: "#1F7A63",
  },

  imageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },

  image: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginRight: 8,
  },

  thumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    marginTop: 8,
  },

  submitBtn: {
    marginTop: 20,
    backgroundColor: "#1F7A63",
    padding: 16,
    borderRadius: 14,
  },

  submitText: {
    color: "#fff",
    fontWeight: "900",
    textAlign: "center",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
})
