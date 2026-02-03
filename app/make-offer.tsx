import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Image,
  KeyboardAvoidingView,
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

/* ---------------- SCREEN ---------------- */

export default function MakeOfferScreen() {
  const router = useRouter()
  const { listingId } = useLocalSearchParams<{ listingId: string }>()
  const { session } = useAuth()

  const [listing, setListing] = useState<any>(null)
  const [offer, setOffer] = useState("")
  const [loading, setLoading] = useState(false)
  const [minError, setMinError] = useState<string | null>(null)

  /* ---------------- LOAD LISTING ---------------- */

  useEffect(() => {
    if (!listingId) return

    supabase
      .from("listings")
      .select("id, title, price, image_urls, min_offer, user_id")
      .eq("id", listingId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Listing load error:", error)
          return
        }
        setListing(data)
      })
  }, [listingId])

  const numericOffer = Number(offer)

  /* ---------------- FEES ---------------- */

  // ✅ Buyer protection ONLY (1.5%)
  const buyerFee = useMemo(() => {
    if (!numericOffer || numericOffer <= 0) return 0
    return Number((numericOffer * 0.015).toFixed(2))
  }, [numericOffer])

  // ❗ Stripe fee intentionally NOT included here (handled at checkout)
  const totalDue = useMemo(() => {
    if (!numericOffer || numericOffer <= 0) return 0
    return Number((numericOffer + buyerFee).toFixed(2))
  }, [numericOffer, buyerFee])

  /* ---------------- VALIDATION ---------------- */

  useEffect(() => {
    if (
      minError &&
      typeof listing?.min_offer === "number" &&
      numericOffer >= listing.min_offer
    ) {
      setMinError(null)
    }
  }, [numericOffer, listing, minError])

  /* ---------------- SUBMIT ---------------- */

  const submitOffer = async () => {
    if (!session?.user || !listing) return

    if (!numericOffer || numericOffer <= 0) {
      Alert.alert("Invalid offer", "Enter a valid offer amount.")
      return
    }

    if (
      typeof listing.min_offer === "number" &&
      numericOffer < listing.min_offer
    ) {
      setMinError(`Minimum offer is $${listing.min_offer.toFixed(2)}`)
      return
    }

    setLoading(true)

    const { error } = await supabase.from("offers").insert({
      listing_id: listing.id,
      buyer_id: session.user.id,
      seller_id: listing.user_id,

      offer_amount: numericOffer,
      original_offer: numericOffer,
      current_amount: numericOffer,

      buyer_fee: buyerFee,
      total_due: totalDue,

      status: "pending",
      last_action: "buyer",
      last_actor: "buyer",
      counter_count: 0,

      expires_at: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString(),
    })

    setLoading(false)

    if (error) {
      if (error.code === "23505") {
        Alert.alert(
          "Offer already sent",
          "You already have an active offer on this item."
        )
      } else {
        console.error("Offer insert error:", error)
        Alert.alert("Error", "Failed to submit offer.")
      }
      return
    }

    Alert.alert(
      "Offer Sent",
      "The seller has been notified. You’ll be able to respond if they counter."
    )

    router.back()
  }

  if (!listing) return null

  /* ---------------- UI ---------------- */

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
          contentContainerStyle={{ padding: 20, paddingBottom: 200 }}
          keyboardShouldPersistTaps="handled"
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

            {minError && <Text style={styles.minError}>{minError}</Text>}

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
                  label="Buyer protection (1.5%)"
                  value={`$${buyerFee.toFixed(2)}`}
                />

                <View style={styles.divider} />

                <Row
                  label="Total if accepted"
                  value={`$${totalDue.toFixed(2)}`}
                  bold
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.submit}
              onPress={submitOffer}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? "Sending..." : "Submit Offer"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Submitting an offer does not guarantee acceptance. Offers expire
              after 24 hours.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  screen: { flex: 1, backgroundColor: "#EAF4EF" },

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
    marginTop: 6,
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

  boldText: { fontWeight: "900" },

  divider: {
    height: 1,
    backgroundColor: "#CFE5DA",
    marginVertical: 8,
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
})
