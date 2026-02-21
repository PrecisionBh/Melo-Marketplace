// app/create-listing.tsx
import AppHeader from "@/components/app-header"
import CreateListingForm from "@/components/create-listing"
import ReturnAddressRequiredModal from "@/components/modals/ReturnAddressRequiredModal"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"
import { useFocusEffect } from "expo-router"
import { useCallback, useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"

export default function CreateListingScreen() {
  const { session } = useAuth()

  const [checkingAddress, setCheckingAddress] = useState(true)
  const [hasReturnAddress, setHasReturnAddress] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)

  /* ---------------- CHECK RETURN ADDRESS GUARD ---------------- */
  useFocusEffect(
    useCallback(() => {
      const checkReturnAddress = async () => {
        if (!session?.user) {
          setCheckingAddress(false)
          return
        }

        try {
          setCheckingAddress(true)

          const { data, error } = await supabase
            .from("seller_return_addresses")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle()

          if (error) {
            handleAppError(error, {
              context: "create_listing_check_return_address",
              fallbackMessage:
                "Unable to verify return address. Please try again.",
            })
            setHasReturnAddress(false)
            setShowAddressModal(true)
            return
          }

          if (!data) {
            // 🔒 No address on file → block selling + show modal
            setHasReturnAddress(false)
            setShowAddressModal(true)
          } else {
            setHasReturnAddress(true)
            setShowAddressModal(false)
          }
        } catch (err) {
          handleAppError(err, {
            context: "create_listing_check_return_address_catch",
            fallbackMessage:
              "Something went wrong while verifying your return address.",
          })
          setHasReturnAddress(false)
          setShowAddressModal(true)
        } finally {
          setCheckingAddress(false)
        }
      }

      checkReturnAddress()
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
})
