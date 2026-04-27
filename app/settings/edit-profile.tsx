import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

import { useEffect, useState } from "react"
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

export default function ReturnAddressScreen() {
  const [loading, setLoading] = useState(false)

  const [fullName, setFullName] = useState("")
  const [line1, setLine1] = useState("")
  const [line2, setLine2] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [zip, setZip] = useState("")

  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [verifiedAddress, setVerifiedAddress] = useState<any>(null)

  useEffect(() => {
    loadAddress()
  }, [])

  const loadAddress = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return

      const { data } = await supabase
        .from("profiles")
        .select(`
          shipping_name,
          address_line1,
          address_line2,
          city,
          state,
          postal_code
        `)
        .eq("id", userId)
        .single()

      if (!data) return

      setFullName(data.shipping_name ?? "")
      setLine1(data.address_line1 ?? "")
      setLine2(data.address_line2 ?? "")
      setCity(data.city ?? "")
      setState(data.state ?? "")
      setZip(data.postal_code ?? "")
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to load address.",
      })
    }
  }

  const verifyAddress = async () => {
    try {
      const res = await fetch(
        "https://ccrrxdpfepsoghtgtpwx.functions.supabase.co/verify-address",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address_line1: line1,
            address_line2: line2,
            city,
            state,
            postal_code: zip,
          }),
        }
      )

      try {
  const json = await res.json()
  return json
} catch {
  return { fallback: true }
}
    } catch {
      return { fallback: true }
    }
  }

  const deactivateUserListings = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return

      await supabase
        .from("listings")
        .update({ status: "inactive" })
        .eq("user_id", userId)
        .eq("status", "active")
        .eq("is_sold", false)

      Alert.alert(
        "Listings Deactivated",
        "Your active listings were turned off because you removed your address."
      )
    } catch (err) {
      console.warn("⚠️ Deactivation error:", err)
    }
  }

  const saveWithAddress = async (addr: any) => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return

      await supabase
        .from("profiles")
        .update({
          shipping_name: fullName.trim(),
          address_line1: addr?.street1 ?? line1.trim(),
          address_line2: addr?.street2 ?? line2.trim(),
          city: addr?.city ?? city.trim(),
          state: addr?.state ?? state.trim(),
          postal_code: addr?.zip ?? zip.trim(),
        })
        .eq("id", userId)

      Alert.alert("Saved", "Address saved successfully.")
      await loadAddress()
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to save address.",
      })
    }
  }

  const saveAddress = async () => {
    try {
      setLoading(true)

      const removingAddress =
        !line1.trim() ||
        !city.trim() ||
        !state.trim() ||
        !zip.trim()

      const verifyData = await verifyAddress()

      if (verifyData?.fallback) {
        if (removingAddress) await deactivateUserListings()
        return saveWithAddress({})
      }

      if (!verifyData?.verifications?.delivery?.success) {
  Alert.alert(
    "Couldn’t Verify Address",
    "We couldn’t verify this address. You can still continue.",
    [
      {
        text: "Continue Anyway",
        onPress: async () => {
          if (removingAddress) await deactivateUserListings()
          await saveWithAddress({})
        },
      },
      { text: "Cancel", style: "cancel" },
    ]
  )
  return
}

      const verified = verifyData

      const isDifferent =
        verified?.street1 !== line1 ||
        verified?.city !== city ||
        verified?.state !== state ||
        verified?.zip !== zip

      if (isDifferent) {
        setVerifiedAddress(verified)
        setShowVerifyModal(true)
        return
      }

      if (removingAddress) await deactivateUserListings()

      await saveWithAddress(verified)
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Failed to save address.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.screen}>
      <GlobalHeader />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle}>Shipping Address</Text>

          <View style={styles.card}>
            <Text style={styles.helper}>
              This address is required for selling and shipping.
            </Text>

            <TextInput
  value={fullName}
  onChangeText={setFullName}
  placeholder="Full Name"
  placeholderTextColor="#1b1b1b"
  style={styles.input}
/>

<TextInput
  value={line1}
  onChangeText={setLine1}
  placeholder="Address Line 1"
  placeholderTextColor="#1b1b1b"
  style={styles.input}
/>

<TextInput
  value={line2}
  onChangeText={setLine2}
  placeholder="Address Line 2 (Optional)"
  placeholderTextColor="#1b1b1b"
  style={styles.input}
/>

<TextInput
  value={city}
  onChangeText={setCity}
  placeholder="City"
  placeholderTextColor="#1b1b1b"
  style={styles.input}
/>

<TextInput
  value={state}
  onChangeText={setState}
  placeholder="State"
  placeholderTextColor="#1b1b1b"
  style={styles.input}
/>

<TextInput
  value={zip}
  onChangeText={setZip}
  placeholder="ZIP Code"
  placeholderTextColor="#1b1b1b"
  style={styles.input}
/>
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => {
              const removingAddress =
                !line1.trim() ||
                !city.trim() ||
                !state.trim() ||
                !zip.trim()

              if (removingAddress) {
                Alert.alert(
                  "Remove Address?",
                  "This will deactivate all active listings.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Continue", onPress: saveAddress },
                  ]
                )
                return
              }

              saveAddress()
            }}
          >
            <Text style={styles.saveText}>
              {loading ? "Verifying..." : "Save Address"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* VERIFY MODAL */}
      {showVerifyModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              We found a better formatted address
            </Text>

            <Text style={styles.modalText}>
              {verifiedAddress?.street1}
              {"\n"}
              {verifiedAddress?.city}, {verifiedAddress?.state} {verifiedAddress?.zip}
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                setShowVerifyModal(false)
                saveWithAddress(verifiedAddress)
              }}
            >
              <Text style={styles.primaryText}>Use Verified</Text>
            </TouchableOpacity>

            <TouchableOpacity
  style={[styles.primaryBtn, { backgroundColor: "#E5E7EB", marginTop: 10 }]}
  onPress={() => {
    setShowVerifyModal(false)
    saveWithAddress({})
  }}
>
  <Text style={{ fontWeight: "800", color: "#111" }}>
    Keep My Address
  </Text>
</TouchableOpacity>

<Text
  style={{
    fontSize: 12,
    color: "#6B7280",
    marginTop: 12,
    textAlign: "center",
  }}
>
  By using an unverified address, you accept responsibility for delivery issues.
  Melo is not liable for returns sent to an incorrect address.
</Text>
          </View>
        </View>
      )}

      <GlobalFooter />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F8F8" },
  content: { padding: 16, paddingBottom: 120 },

  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },

  helper: {
    fontSize: 13,
    marginBottom: 16,
    color: "#000000",
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  saveBtn: {
    backgroundColor: "#D97732",
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  saveText: {
    color: "#fff",
    fontWeight: "800",
  },

  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "85%",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },

  modalText: {
    fontSize: 15,
    marginBottom: 16,
  },

  primaryBtn: {
    backgroundColor: "#D97732",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  primaryText: {
    color: "#fff",
    fontWeight: "800",
  },
})