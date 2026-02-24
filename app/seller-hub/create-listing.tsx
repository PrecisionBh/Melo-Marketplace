// app/create-listing.tsx
import AppHeader from "@/components/app-header"
import CreateListingForm from "@/components/create-listing"
import ProFeaturesCard from "@/components/create-listing/ProFeaturesCard"
import ReturnAddressRequiredModal from "@/components/modals/ReturnAddressRequiredModal"
import UpgradeToProButton from "@/components/pro/UpgradeToProButton"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"
import { useFocusEffect } from "expo-router"
import { useCallback, useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"

type ProfileRow = {
  is_pro: boolean | null
  boosts_remaining: number | null
}

export default function CreateListingScreen() {
  const { session } = useAuth()

  const [checkingAddress, setCheckingAddress] = useState(true)
  const [hasReturnAddress, setHasReturnAddress] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)

  // 🟡 Pro state (typed + DB driven)
  const [checkingPro, setCheckingPro] = useState(true)
  const [isPro, setIsPro] = useState<boolean>(false)
  const [boostsRemaining, setBoostsRemaining] = useState<number>(0)

  // 🟢 Controlled states for ProFeaturesCard UI only
  const [isBoosted, setIsBoosted] = useState<boolean>(false)
  const [quantity, setQuantity] = useState<string>("1")

  /* ---------------- CHECK RETURN ADDRESS + PRO PROFILE ---------------- */
  useFocusEffect(
    useCallback(() => {
      const loadGuardsAndProfile = async () => {
        if (!session?.user) {
          setCheckingAddress(false)
          setCheckingPro(false)
          return
        }

        try {
          setCheckingAddress(true)
          setCheckingPro(true)

          /* 🔒 1. CHECK RETURN ADDRESS */
          const { data: addressData, error: addressError } = await supabase
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
            setHasReturnAddress(false)
            setShowAddressModal(true)
          } else if (!addressData) {
            setHasReturnAddress(false)
            setShowAddressModal(true)
          } else {
            setHasReturnAddress(true)
            setShowAddressModal(false)
          }

          /* ⭐ 2. FETCH PRO PROFILE (typed) */
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("is_pro, boosts_remaining")
            .eq("id", session.user.id)
            .single<ProfileRow>()

          if (profileError) throw profileError

          // Force strict types to avoid TS prop errors
          setIsPro(Boolean(profile?.is_pro))
          setBoostsRemaining(profile?.boosts_remaining ?? 0)
        } catch (err) {
          handleAppError(err, {
            context: "create_listing_load_profile_and_guards",
            silent: true,
          })
          setIsPro(false)
          setBoostsRemaining(0)
        } finally {
          setCheckingAddress(false)
          setCheckingPro(false)
        }
      }

      loadGuardsAndProfile()
    }, [session?.user?.id])
  )

  /* ---------------- LOADING STATE ---------------- */
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

  /* ---------------- UI ---------------- */
  return (
    <View style={styles.screen}>
      <AppHeader title="Create Listing" backRoute="/seller-hub" />

      {/* ⭐ PRO FEATURES CARD (fully typed + no TS errors) */}
      {!checkingPro && (
        <View style={styles.proCardWrap}>
          <ProFeaturesCard
            isPro={!!isPro}
            boostsRemaining={boostsRemaining}
            isBoosted={isBoosted}
            setIsBoosted={setIsBoosted}
            quantity={quantity}
            setQuantity={setQuantity}
          />
        </View>
      )}

      {/* ⭐ UPGRADE CTA (NON-PRO ONLY) */}
      {!checkingPro && !isPro && (
        <UpgradeToProButton
          style={{ marginHorizontal: 16, marginBottom: 4 }}
        />
      )}

      {/* 🚫 HARD GUARD: Only show form if address exists */}
      {hasReturnAddress && <CreateListingForm />}

      {/* 🔒 RETURN ADDRESS REQUIRED MODAL */}
      <ReturnAddressRequiredModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7FBF9", // Melo theme
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  proCardWrap: {
    marginHorizontal: 16,
    marginTop: 12,
  },
})