import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useState } from "react"
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

export default function EditAccountScreen() {
  const router = useRouter()
  const { session } = useAuth()

  const userEmail = session?.user?.email ?? ""

  const [currentPassword, setCurrentPassword] = useState("")

  const [newEmail, setNewEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [loading, setLoading] = useState(false)

  /* ---------------- REAUTH ---------------- */

  const reauthenticate = async () => {
    if (!userEmail || !currentPassword) {
      Alert.alert("Missing password", "Please enter your current password.")
      return false
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    })

    if (error) {
      Alert.alert("Authentication failed", "Current password is incorrect.")
      return false
    }

    return true
  }

  /* ---------------- UPDATE EMAIL ---------------- */

  const updateEmail = async () => {
    if (!newEmail || !confirmEmail) {
      Alert.alert("Missing email", "Please fill out both email fields.")
      return
    }

    if (newEmail !== confirmEmail) {
      Alert.alert("Email mismatch", "Emails do not match.")
      return
    }

    setLoading(true)

    const ok = await reauthenticate()
    if (!ok) {
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      email: newEmail.trim(),
    })

    setLoading(false)

    if (error) {
      Alert.alert("Update failed", error.message)
      return
    }

    Alert.alert(
      "Email updated",
      "Please check your new email to confirm the change."
    )

    setNewEmail("")
    setConfirmEmail("")
    setCurrentPassword("")
  }

  /* ---------------- UPDATE PASSWORD ---------------- */

  const updatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Missing password", "Please fill out both password fields.")
      return
    }

    if (newPassword.length < 6) {
      Alert.alert("Invalid password", "Password must be at least 6 characters.")
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.")
      return
    }

    setLoading(true)

    const ok = await reauthenticate()
    if (!ok) {
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setLoading(false)

    if (error) {
      Alert.alert("Update failed", error.message)
      return
    }

    Alert.alert("Password updated", "Your password has been changed.")

    setNewPassword("")
    setConfirmPassword("")
    setCurrentPassword("")
  }

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      {/* HEADER (keep outside scroll so it doesn't jump) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1E17" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Account</Text>
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
            flexGrow: 1,
            padding: 20,
            paddingBottom: 220, // <- key: extra space so bottom fields clear keyboard
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* CURRENT PASSWORD */}
          <Text style={styles.label}>Current Password *</Text>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            style={styles.input}
          />

          {/* EMAIL */}
          <Text style={styles.section}>Change Email</Text>

          <TextInput
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="New email"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <TextInput
            value={confirmEmail}
            onChangeText={setConfirmEmail}
            placeholder="Confirm new email"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={updateEmail}
            disabled={loading}
          >
            <Text style={styles.saveText}>Update Email</Text>
          </TouchableOpacity>

          {/* PASSWORD */}
          <Text style={styles.section}>Change Password</Text>

          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            secureTextEntry
            style={styles.input}
          />

          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={updatePassword}
            disabled={loading}
          >
            <Text style={styles.saveText}>Update Password</Text>
          </TouchableOpacity>

          {/* Spacer so last button always scrolls above keyboard */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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

  section: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F1E17",
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },

  saveBtn: {
    marginTop: 8,
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
