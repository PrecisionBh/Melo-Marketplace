import { notify } from "@/lib/notifications/notify"
import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useMemo, useRef, useState } from "react"
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
import { handleAppError } from "../lib/errors/appError"
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

  // 🔒 Prevent double submit spam taps
  const submittingRef = useRef(false)

  /* ---------------- LOAD LISTING ---------------- */

  useEffect(() => {
    if (!listingId) return

    let isMounted = true

    const loadListing = async () => {
      try {
        const { data, error } = await supabase
          .from("listings")
          .select(`
            id,
            title,
            price,
            image_urls,
            min_offer,
            user_id,
            shipping_type,
            shipping_price
          `)
          .eq("id", listingId)
          .single()

        if (error) throw error

        if (isMounted) {
          setListing(data)
        }
      } catch (err) {
        console.error("Listing load error:", err)
        handleAppError(err, {
          fallbackMessage: "Failed to load listing. Please try again.",
        })
      }
    }

    loadListing()

    return () => {
      isMounted = false
    }
  }, [listingId])

  const numericOffer = Number(offer)

  /* ---------------- SHIPPING ---------------- */

  const shippingCost = useMemo(() => {
    if (!listing) return 0
    return listing.shipping_type === "buyer_pays"
      ? Number(listing.shipping_price ?? 0)
      : 0
  }, [listing])

  /* ---------------- FEES (UNCHANGED + DISPLAY-ONLY SALES TAX) ---------------- */
  // Buyer fee = 1.5% buyer protection + 2.9% processing + $0.30
  const buyerFee = useMemo(() => {
    if (!numericOffer || numericOffer <= 0) return 0
    return Number((numericOffer * 0.044 + 0.3).toFixed(2))
  }, [numericOffer])

  // 🔥 DISPLAY ONLY — NOT STORED, NOT USED IN DB
  const salesTax = useMemo(() => {
    if (!numericOffer || numericOffer <= 0) return 0
    return Number((numericOffer * 0.075).toFixed(2))
  }, [numericOffer])

  const totalDue = useMemo(() => {
    if (!numericOffer || numericOffer <= 0) return 0
    return Number(
      (numericOffer + buyerFee + salesTax + shippingCost).toFixed(2)
    )
  }, [numericOffer, buyerFee, salesTax, shippingCost])

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
    if (submittingRef.current) return
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

    try {
      submittingRef.current = true
      setLoading(true)

      const { data: newOffer, error } = await supabase
        .from("offers")
        .insert({
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
        .select("id")
        .single()

      if (error) {
        if (error.code === "23505") {
          Alert.alert(
            "Offer already sent",
            "You already have an active offer on this item."
          )
          return
        }
        throw error
      }

      /* ✅ NOTIFY AFTER SUCCESS (non-blocking safe) */
      try {
        await notify({
          userId: listing.user_id,
          type: "offer",
          title: "New offer received",
          body: `You received a new offer on "${listing.title}"`,
          data: {
            route: "/seller-hub/offers/[id]",
            params: {
              id: newOffer.id,
            },
          },
        })
      } catch (notifyErr) {
        console.warn("Notify failed:", notifyErr)
      }

      Alert.alert(
        "Offer Sent",
        "The seller has been notified. You’ll be able to respond if they counter."
      )

      router.back()
    } catch (err) {
      console.error("Offer submit error:", err)
      handleAppError(err, {
        fallbackMessage: "Failed to submit offer. Please try again.",
      })
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  if (!listing) return null


  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Make Offer</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {listing.image_urls?.[0] && (
            <Image
              source={{ uri: listing.image_urls[0] }}
              style={styles.image}
            />
          )}

          <View style={styles.card}>
            <Text style={styles.title}>{listing.title}</Text>
            <Text style={styles.listedPrice}>
              Listed at ${Number(listing.price).toFixed(2)}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Your Offer</Text>

            {minError && <Text style={styles.minError}>{minError}</Text>}

            <TextInput
              placeholder="Enter your offer"
              keyboardType="decimal-pad"
              value={offer}
              onChangeText={setOffer}
              style={styles.input}
            />

            {numericOffer > 0 && (
              <View style={styles.summary}>
                <Row
                  label="Offer amount"
                  value={`$${numericOffer.toFixed(2)}`}
                />

                {shippingCost > 0 && (
                  <Row
                    label="Shipping"
                    value={`$${shippingCost.toFixed(2)}`}
                  />
                )}

                <Row
                  label="Buyer protection & processing"
                  value={`$${buyerFee.toFixed(2)}`}
                />

                {/* 🔥 NEW DISPLAY-ONLY SALES TAX LINE */}
                <Row
                  label="Estimated sales tax (7.5%)"
                  value={`$${salesTax.toFixed(2)}`}
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
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={submitOffer}
              disabled={loading}
            >
              <Text style={styles.primaryText}>
                {loading ? "Sending..." : "Submit Offer"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.reassurance}>
              Submitting an offer does not guarantee acceptance.
            </Text>

            <Text style={styles.reassurance}>
              Offers expire after 24 hours.
            </Text>

            <View style={styles.protectionPill}>
              <Ionicons
                name="shield-checkmark"
                size={14}
                color="#1F7A63"
              />
              <Text style={styles.protectionText}>
                Buyer Protection Included
              </Text>
            </View>
          </View>

          <View style={{ height: 120 }} />
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
    paddingBottom: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#7FAF9B",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  content: {
    padding: 20,
  },

  image: {
    width: "100%",
    height: 220,
    resizeMode: "contain",
    marginBottom: 12,
    backgroundColor: "#D6E6DE",
    borderRadius: 12,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F1E17",
  },

  listedPrice: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#2E5F4F",
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F1E17",
    marginBottom: 10,
  },

  minError: {
    marginBottom: 10,
    fontSize: 12,
    color: "#C0392B",
    fontWeight: "800",
  },

  input: {
    backgroundColor: "#F4F4F4",
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
  },

  summary: {
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D6E6DE",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7, // ⬅️ slightly more breathing room
  },

  rowLabel: {
    color: "#6B8F7D",
    fontWeight: "600",
  },

  rowValue: {
    color: "#0F1E17",
    fontWeight: "700",
  },

  boldText: {
    fontWeight: "900",
  },

  divider: {
    height: 1,
    backgroundColor: "#C6DDD2", // ⬅️ a touch darker for separation
    marginVertical: 10,
  },

  primaryBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: "#0F1E17",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },

  primaryText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },

  reassurance: {
    fontSize: 12,
    textAlign: "center",
    color: "#6B8F7D",
    fontWeight: "600",
    marginTop: 10,
  },

  protectionPill: {
    marginTop: 8,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  protectionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F7A63",
  },
})
