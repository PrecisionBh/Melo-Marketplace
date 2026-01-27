import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useState } from "react"
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

import { useAuth } from "../../../context/AuthContext"
import { supabase } from "../../../lib/supabase"

const REASONS = [
  "Item not received",
  "Item not as described",
  "Item arrived damaged",
  "Seller unresponsive",
  "Other",
]

export default function DisputeIssuePage() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>()
  const router = useRouter()
  const { session } = useAuth()
  const user = session?.user

  const [reason, setReason] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  if (!orderId || !user) {
    return null
  }

  /* ---------------- IMAGE PICKER ---------------- */

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    })

    if (!result.canceled && result.assets[0]?.uri) {
      setImages((prev) => [...prev, result.assets[0].uri])
    }
  }

  /* ---------------- UPLOAD EVIDENCE ---------------- */

  const uploadEvidenceImages = async (disputeId: string) => {
    const uploadedUrls: string[] = []

    for (const uri of images) {
      const response = await fetch(uri)
      const blob = await response.blob()
      const filename = `${Date.now()}-${Math.random()}.jpg`
      const path = `${disputeId}/${filename}`

      const { error } = await supabase.storage
        .from("dispute-images")
        .upload(path, blob, { contentType: "image/jpeg" })

      if (error) throw error

      const { data } = supabase.storage
        .from("dispute-images")
        .getPublicUrl(path)

      uploadedUrls.push(data.publicUrl)
    }

    return uploadedUrls
  }

  /* ---------------- SUBMIT DISPUTE ---------------- */

  const submitDispute = async () => {
    if (!reason || !description.trim()) {
      Alert.alert(
        "Missing info",
        "Please select a reason and add a description."
      )
      return
    }

    try {
      setSubmitting(true)

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("buyer_id, seller_id")
        .eq("id", orderId)
        .single()

      if (orderError || !order) throw orderError

      const { data: dispute, error: disputeError } = await supabase
        .from("disputes")
        .insert({
          order_id: orderId,
          buyer_id: order.buyer_id,
          seller_id: order.seller_id,
          reason,
          description,
          status: "open",
        })
        .select()
        .single()

      if (disputeError || !dispute) throw disputeError

      if (images.length > 0) {
        const evidenceUrls = await uploadEvidenceImages(dispute.id)

        await supabase
          .from("disputes")
          .update({ evidence_urls: evidenceUrls })
          .eq("id", dispute.id)
      }

      await supabase
        .from("orders")
        .update({ status: "disputed" })
        .eq("id", orderId)

      Alert.alert(
        "Dispute submitted",
        "Your dispute has been submitted and is under review."
      )

      router.back()
    } catch (err) {
      console.error(err)
      Alert.alert(
        "Error",
        "Unable to submit dispute. Please try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#1F7A63" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>File a Dispute</Text>

        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* ORDER REFERENCE */}
        <Text style={styles.orderRef}>
          Order #{orderId.slice(0, 8)}
        </Text>

        {/* REASON */}
        <Text style={styles.label}>Reason</Text>
        {REASONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              styles.reasonBtn,
              reason === r && styles.reasonSelected,
            ]}
            onPress={() => setReason(r)}
          >
            <Text
              style={[
                styles.reasonText,
                reason === r && styles.reasonTextSelected,
              ]}
            >
              {r}
            </Text>
          </TouchableOpacity>
        ))}

        {/* DESCRIPTION */}
        <Text style={styles.label}>Describe the issue</Text>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Explain what went wrong..."
          value={description}
          onChangeText={setDescription}
        />

        {/* EVIDENCE */}
        <Text style={styles.label}>Upload evidence (optional)</Text>
        <View style={styles.imageRow}>
          {images.map((uri, idx) => (
            <Image key={idx} source={{ uri }} style={styles.image} />
          ))}

          <TouchableOpacity style={styles.addImage} onPress={pickImage}>
            <Text style={styles.addImageText}>＋</Text>
          </TouchableOpacity>
        </View>

        {/* SUBMIT */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={submitDispute}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit Dispute</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F7F8",
  },

  header: {
    height: 90,
    backgroundColor: "#E8F5EE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D1E9DD",
  },

  backBtn: {
    width: 32,
    alignItems: "flex-start",
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F7A63",
  },

  container: {
    padding: 16,
    paddingBottom: 32,
  },

  orderRef: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 12,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 6,
  },

  reasonBtn: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#E9ECEF",
    marginBottom: 8,
  },

  reasonSelected: {
    backgroundColor: "#1F7A63",
  },

  reasonText: {
    color: "#000",
  },

  reasonTextSelected: {
    color: "#fff",
  },

  textArea: {
    minHeight: 120,
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 12,
    textAlignVertical: "top",
  },

  imageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },

  image: {
    width: 80,
    height: 80,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },

  addImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
    backgroundColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },

  addImageText: {
    fontSize: 32,
    color: "#374151",
  },

  submitBtn: {
    marginTop: 22,
    backgroundColor: "#1F7A63",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
