import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabase"

export default function MakeOfferScreen() {
  const router = useRouter()
  const { listingId } = useLocalSearchParams<{ listingId: string }>()
  const { session } = useAuth()

  const [listing, setListing] = useState<any>(null)
  const [offer, setOffer] = useState("")
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [minError, setMinError] = useState<string | null>(null)

  useEffect(() => {
    if (!listingId) return

    supabase
      .from("listings")
      .select("id,title,price,image_urls,min_offer")
      .eq("id", listingId)
      .single()
      .then(({ data }) => setListing(data))
  }, [listingId])

  const numericOffer = Number(offer)

  // Clear min error when offer becomes valid
  useEffect(() => {
    if (
      minError &&
      typeof listing?.min_offer === "number" &&
      numericOffer >= listing.min_offer
    ) {
      setMinError(null)
    }
  }, [numericOffer, listing, minError])

  const buyerFee = useMemo(() => {
    if (!numericOffer || numericOffer <= 0) return 0
    return numericOffer * 0.03
  }, [numericOffer])

  const totalCharge = useMemo(() => {
    if (!numericOffer || numericOffer <= 0) return 0
    return numericOffer + buyerFee
  }, [numericOffer, buyerFee])

  const handleSubmitPress = () => {
    if (!numericOffer || numericOffer <= 0) {
      Alert.alert("Invalid offer", "Enter a valid offer amount.")
      return
    }

    if (
      typeof listing.min_offer === "number" &&
      numericOffer < listing.min_offer
    ) {
      setMinError(
        `Minimum offer is $${listing.min_offer.toFixed(2)}`
      )
      return
    }

    setShowConfirm(true)
  }

  const submitOffer = async () => {
    if (!session?.user || !listing) return

    setShowConfirm(false)
    setLoading(true)

    await supabase.from("offers").insert({
      listing_id: listingId,
      buyer_id: session.user.id,
      amount: numericOffer,
      status: "pending",
    })

    setLoading(false)

    Alert.alert(
      "Offer Sent",
      "If the seller accepts, your payment method will be charged automatically."
    )

    router.back()
  }

  if (!listing) return null

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.title}>Make Offer</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 300,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Image
              source={{ uri: listing.image_urls?.[0] }}
              style={styles.image}
            />

            <Text style={styles.name}>{listing.title}</Text>

            <Text style={styles.price}>
              Listed at ${listing.price.toFixed(2)}
            </Text>

            {/* 🔴 MIN OFFER ERROR */}
            {minError && (
              <Text style={styles.minError}>
                {minError}
              </Text>
            )}

            <TextInput
              placeholder="Your offer"
              keyboardType="decimal-pad"
              value={offer}
              onChangeText={setOffer}
              style={styles.input}
            />

            {numericOffer > 0 && (
              <View style={styles.totalBox}>
                <Row
                  label="Offer amount"
                  value={`$${numericOffer.toFixed(2)}`}
                />
                <Row
                  label="Buyer protection (3%)"
                  value={`$${buyerFee.toFixed(2)}`}
                />

                <View style={styles.divider} />

                <Row
                  label="Total if accepted"
                  value={`$${totalCharge.toFixed(2)}`}
                  bold
                />

                <Text style={styles.autoCharge}>
                  If accepted,{" "}
                  <Text style={{ fontWeight: "900" }}>
                    ${totalCharge.toFixed(2)}
                  </Text>{" "}
                  will be charged automatically to your saved payment method.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.submit}
              onPress={handleSubmitPress}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? "Sending..." : "Submit Offer"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Submitting an offer does not guarantee acceptance. Sellers may
              accept or decline any offer.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* CONFIRM MODAL */}
      <Modal transparent visible={showConfirm} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Authorization Required
            </Text>

            <Text style={styles.modalText}>
              By submitting this offer, you authorize Melo Marketplace to
              automatically charge your saved payment method if the seller
              accepts your offer.
              {"\n\n"}
              This charge will be processed without further confirmation.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={styles.modalCancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={submitOffer}
              >
                <Text style={styles.modalConfirmText}>
                  I Understand & Submit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

/* ---------------- HELPERS ---------------- */

function Row({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.boldText]}>
        {label}
      </Text>
      <Text style={[styles.rowValue, bold && styles.boldText]}>
        {value}
      </Text>
    </View>
  )
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EAF4EF",
  },

  header: {
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

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },

  image: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },

  name: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
  },

  price: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: "#2E5F4F",
  },

  minError: {
    marginTop: 4,
    fontSize: 12,
    color: "#C0392B",
    fontWeight: "700",
  },

  input: {
    marginTop: 20,
    backgroundColor: "#F4F4F4",
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
  },

  totalBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F0FAF6",
    borderWidth: 1,
    borderColor: "#CFE5DA",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },

  rowLabel: {
    fontSize: 13,
    color: "#6B8F7D",
    fontWeight: "600",
  },

  rowValue: {
    fontSize: 13,
    color: "#0F1E17",
    fontWeight: "700",
  },

  boldText: {
    fontWeight: "900",
  },

  divider: {
    height: 1,
    backgroundColor: "#CFE5DA",
    marginVertical: 8,
  },

  autoCharge: {
    marginTop: 8,
    fontSize: 12,
    color: "#2E5F4F",
    lineHeight: 16,
  },

  submit: {
    marginTop: 20,
    backgroundColor: "#0F1E17",
    padding: 14,
    borderRadius: 22,
    alignItems: "center",
  },

  submitText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  disclaimer: {
    marginTop: 14,
    fontSize: 12,
    color: "#6B8F7D",
    textAlign: "center",
    lineHeight: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },

  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F1E17",
    marginBottom: 10,
  },

  modalText: {
    fontSize: 14,
    color: "#4A6B5F",
    lineHeight: 20,
  },

  modalActions: {
    flexDirection: "row",
    marginTop: 20,
    gap: 10,
  },

  modalCancel: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#E4EFEA",
    alignItems: "center",
  },

  modalCancelText: {
    fontWeight: "700",
    color: "#2E5F4F",
  },

  modalConfirm: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#0F1E17",
    alignItems: "center",
  },

  modalConfirmText: {
    fontWeight: "900",
    color: "#fff",
  },
})
