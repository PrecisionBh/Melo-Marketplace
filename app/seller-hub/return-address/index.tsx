import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

import AppHeader from "@/components/app-header"
import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

export default function ReturnAddressScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const [fullName, setFullName] = useState("")
  const [address1, setAddress1] = useState("")
  const [address2, setAddress2] = useState("")
  const [city, setCity] = useState("")
  const [state, setStateValue] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [country, setCountry] = useState("US")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  /* ---------------- LOAD EXISTING ADDRESS (EDIT SUPPORT) ---------------- */
  useEffect(() => {
    if (!session?.user) return
    fetchAddress()
  }, [session?.user])

  const fetchAddress = async () => {
    try {
      const { data, error } = await supabase
        .from("seller_return_addresses")
        .select("*")
        .eq("user_id", session!.user.id)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setFullName(data.full_name ?? "")
        setAddress1(data.address_line1 ?? "")
        setAddress2(data.address_line2 ?? "")
        setCity(data.city ?? "")
        setStateValue(data.state ?? "")
        setPostalCode(data.postal_code ?? "")
        setCountry(data.country ?? "US")
      }
    } catch (err) {
      handleAppError(err, {
        context: "return_address_fetch",
        fallbackMessage: "Failed to load return address.",
      })
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- SAVE ADDRESS ---------------- */
  const saveAddress = async () => {
    if (!session?.user) {
      handleAppError(new Error("User session missing"), {
        context: "return_address_no_session",
        fallbackMessage: "Session expired. Please sign in again.",
      })
      return
    }

    if (!fullName || !address1 || !city || !state || !postalCode) {
      Alert.alert(
        "Missing Information",
        "Please complete all required fields to continue selling on Melo."
      )
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from("seller_return_addresses")
        .upsert({
          user_id: session.user.id,
          full_name: fullName,
          address_line1: address1,
          address_line2: address2,
          city,
          state,
          postal_code: postalCode,
          country,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      Alert.alert(
        "Return Address Saved",
        "Your return address has been saved. You can now create listings."
      )

      router.replace("/seller-hub")
    } catch (err) {
      handleAppError(err, {
        context: "return_address_save",
        fallbackMessage: "Failed to save return address. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  /* ---------------- UI ---------------- */
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <AppHeader title="Return Address" backRoute="/seller-hub" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.info}>
          This address will be used for returns if a buyer files a return.
          A return address is required to create listings and protects both
          buyers and sellers during the escrow return process.
        </Text>

        <Field label="Full Name *" value={fullName} onChange={setFullName} />
        <Field
          label="Address Line 1 *"
          value={address1}
          onChange={setAddress1}
        />
        <Field
          label="Address Line 2"
          value={address2}
          onChange={setAddress2}
        />
        <Field label="City *" value={city} onChange={setCity} />
        <Field label="State *" value={state} onChange={setStateValue} />
        <Field
          label="Postal Code *"
          value={postalCode}
          onChange={setPostalCode}
          keyboardType="number-pad"
        />
        <Field label="Country" value={country} onChange={setCountry} />

        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveAddress}
          disabled={saving}
        >
          <Text style={styles.saveText}>
            {saving ? "Saving..." : "Save Return Address"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

/* ---------------- FIELD COMPONENT ---------------- */
function Field({
  label,
  value,
  onChange,
  keyboardType,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  keyboardType?: any
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholderTextColor="#9BB7AA"
        style={styles.input}
      />
    </View>
  )
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7FBF9",
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  info: {
    marginBottom: 18,
    color: "#2E5F4F",
    fontSize: 14,
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontWeight: "700",
    marginBottom: 6,
    color: "#2E5F4F",
    fontSize: 14,
  },
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
  saveButton: {
    marginTop: 24,
    backgroundColor: "#0F1E17",
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
})
