import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { handleAppError } from "@/lib/errors/appError"
import { supabase } from "@/lib/supabase"

type Props = {
  onSaved?: () => void
  showTitle?: boolean
}

export default function ReturnAddressForm({ onSaved, showTitle = true }: Props) {
  const { session } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [fullName, setFullName] = useState("")
  const [address1, setAddress1] = useState("")
  const [address2, setAddress2] = useState("")
  const [city, setCity] = useState("")
  const [state, setStateValue] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [country, setCountry] = useState("US")

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
        context: "return_address_component_fetch",
        fallbackMessage: "Failed to load return address.",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveAddress = async () => {
    if (!session?.user) return

    if (!fullName || !address1 || !city || !state || !postalCode) {
      Alert.alert("Missing Info", "Please fill out all required fields.")
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

      Alert.alert("Saved", "Return address updated successfully.")
      onSaved?.()
    } catch (err) {
      handleAppError(err, {
        context: "return_address_component_save",
        fallbackMessage: "Failed to save return address.",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 20 }} />
  }

  return (
    <View style={styles.container}>
      {showTitle && (
        <Text style={styles.title}>Return Address (Required for Selling)</Text>
      )}

      <Field label="Full Name *" value={fullName} onChange={setFullName} />
      <Field label="Address Line 1 *" value={address1} onChange={setAddress1} />
      <Field label="Address Line 2" value={address2} onChange={setAddress2} />
      <Field label="City *" value={city} onChange={setCity} />
      <Field label="State *" value={state} onChange={setStateValue} />
      <Field
        label="Postal Code *"
        value={postalCode}
        onChange={setPostalCode}
        keyboardType="number-pad"
      />
      <Field label="Country" value={country} onChange={setCountry} />

      <TouchableOpacity style={styles.saveBtn} onPress={saveAddress} disabled={saving}>
        <Text style={styles.saveText}>{saving ? "Saving..." : "Save Address"}</Text>
      </TouchableOpacity>
    </View>
  )
}

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
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        style={styles.input}
        placeholderTextColor="#9BB7AA"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 10 },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2E5F4F",
    marginBottom: 12,
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
    color: "#1F3D33",
  },
  saveBtn: {
    marginTop: 10,
    backgroundColor: "#0F1E17",
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontWeight: "900" },
})
