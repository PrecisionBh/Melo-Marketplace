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
  const [loading, setLoading] =
    useState(false)

  const [fullName, setFullName] =
    useState("")
  const [line1, setLine1] =
    useState("")
  const [line2, setLine2] =
    useState("")
  const [city, setCity] =
    useState("")
  const [state, setState] =
    useState("")
  const [zip, setZip] =
    useState("")

  useEffect(() => {
    loadAddress()
  }, [])

  const loadAddress = async () => {
    try {
      const { data: userData } =
        await supabase.auth.getUser()

      const userId =
        userData?.user?.id

      if (!userId) return

      const { data } =
        await supabase
          .from("profiles")
          .select(`
            return_full_name,
            return_address_line1,
            return_address_line2,
            return_city,
            return_state,
            return_zip
          `)
          .eq("id", userId)
          .single()

      if (!data) return

      setFullName(
        data.return_full_name ?? ""
      )
      setLine1(
        data.return_address_line1 ?? ""
      )
      setLine2(
        data.return_address_line2 ?? ""
      )
      setCity(
        data.return_city ?? ""
      )
      setState(
        data.return_state ?? ""
      )
      setZip(
        data.return_zip ?? ""
      )
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to load address.",
      })
    }
  }

  const saveAddress = async () => {
    try {
      setLoading(true)

      const { data: userData } =
        await supabase.auth.getUser()

      const userId =
        userData?.user?.id

      if (!userId) return

      const { error } =
        await supabase
          .from("profiles")
          .update({
            return_full_name:
              fullName.trim(),
            return_address_line1:
              line1.trim(),
            return_address_line2:
              line2.trim(),
            return_city:
              city.trim(),
            return_state:
              state.trim(),
            return_zip:
              zip.trim(),
          })
          .eq("id", userId)

      if (error) throw error

      Alert.alert(
        "Saved",
        "Return address updated successfully."
      )
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to save address.",
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
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
        keyboardVerticalOffset={
          Platform.OS === "ios"
            ? 90
            : 20
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>
            Return Address
          </Text>

          <View style={styles.card}>
            <Text style={styles.helper}>
              This address will be used to
              auto-fill your return labels
              and may be used for future
              shipping defaults.
            </Text>

            <TextInput
              value={fullName}
              onChangeText={
                setFullName
              }
              placeholder="Full Name"
              style={styles.input}
            />

            <TextInput
              value={line1}
              onChangeText={setLine1}
              placeholder="Address Line 1"
              style={styles.input}
            />

            <TextInput
              value={line2}
              onChangeText={setLine2}
              placeholder="Address Line 2 (Optional)"
              style={styles.input}
            />

            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="City"
              style={styles.input}
            />

            <TextInput
              value={state}
              onChangeText={setState}
              placeholder="State"
              style={styles.input}
            />

            <TextInput
              value={zip}
              onChangeText={setZip}
              placeholder="ZIP Code"
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={saveAddress}
            disabled={loading}
          >
            <Text style={styles.saveText}>
              {loading
                ? "Saving..."
                : "Save Address"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <GlobalFooter />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },

  content: {
    padding: 16,
    paddingBottom: 120,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 18,
    marginBottom: 18,
  },

  helper: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
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
    fontSize: 15,
  },
})