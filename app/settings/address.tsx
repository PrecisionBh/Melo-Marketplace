import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
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

import { useAuth } from "../../context/AuthContext"
import { supabase } from "../../lib/supabase"

export default function AddressScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const userId = session?.user?.id ?? null

  const [address1, setAddress1] = useState("")
  const [address2, setAddress2] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [country, setCountry] = useState("United States")

  const [loading, setLoading] = useState(false)

  /* ---------------- LOAD ADDRESS ---------------- */

  useEffect(() => {
    if (!userId) return

    const loadAddress = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          country
        `
        )
        .eq("id", userId)
        .single()

      if (!error && data) {
        setAddress1(data.address_line1 ?? "")
        setAddress2(data.address_line2 ?? "")
        setCity(data.city ?? "")
        setState(data.state ?? "")
        setPostalCode(data.postal_code ?? "")
        setCountry(data.country ?? "United States")
      }
    }

    loadAddress()
  }, [userId])

  /* ---------------- SAVE ---------------- */

  const saveAddress = async () => {
    if (!userId) return

    if (!address1 || !city || !state || !postalCode) {
      Alert.alert(
        "Missing info",
        "Please complete all required address fields."
      )
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from("profiles")
      .update({
        address_line1: address1.trim(),
        address_line2: address2.trim(),
        city: city.trim(),
        state: state.trim(),
        postal_code: postalCode.trim(),
        country,
      })
      .eq("id", userId)

    setLoading(false)

    if (error) {
      Alert.alert("Save failed", error.message)
      return
    }

    Alert.alert("Saved", "Shipping address updated.")
    router.back()
  }

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Shipping Address</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 220,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          <Field
            label="State *"
            value={state}
            onChange={setState}
            autoCapitalize="characters"
          />

          <Field
            label="ZIP Code *"
            value={postalCode}
            onChange={setPostalCode}
            keyboardType="number-pad"
          />

          {/* COUNTRY (LOCKED MVP) */}
          <Text style={styles.label}>Country</Text>
          <View style={styles.countryBox}>
            <Text style={styles.countryText}>{country}</Text>
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={saveAddress}
            disabled={loading}
          >
            <Text style={styles.saveText}>
              {loading ? "Saving..." : "Save Address"}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

/* ---------------- FIELD ---------------- */

function Field({
  label,
  value,
  onChange,
  keyboardType,
  autoCapitalize,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  keyboardType?: any
  autoCapitalize?: any
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={styles.input}
      />
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
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B8F7D",
    marginBottom: 6,
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },

  countryBox: {
    backgroundColor: "#E6EFEA",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },

  countryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2E5F4F",
  },

  saveBtn: {
    backgroundColor: "#0F1E17",
    borderRadius: 22,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  saveText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
})
