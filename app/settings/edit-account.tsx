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

import AppHeader from "@/components/app-header"
import { useAuth } from "../../context/AuthContext"
import { handleAppError } from "../../lib/errors/appError"
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
    try {
      if (!userEmail || !currentPassword) {
        Alert.alert("Missing password", "Please enter your current password.")
        return false
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      })

      if (error) {
        handleAppError(error, {
          context: "edit_account_reauth_failed",
          fallbackMessage: "Current password is incorrect.",
        })
        return false
      }

      return true
    } catch (err) {
      handleAppError(err, {
        context: "edit_account_reauth_catch",
        fallbackMessage: "Authentication failed. Please try again.",
      })
      return false
    }
  }

  /* ---------------- UPDATE EMAIL ---------------- */

  const updateEmail = async () => {
    try {
      if (!newEmail || !confirmEmail) {
        Alert.alert("Missing email", "Please fill out both email fields.")
        return
      }

      if (newEmail !== confirmEmail) {
        Alert.alert("Email mismatch", "Emails do not match.")
        return
      }

      if (!session?.user) {
        handleAppError(new Error("Session missing"), {
          context: "edit_account_update_email_no_session",
          fallbackMessage: "Your session expired. Please sign in again.",
        })
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

      if (error) {
        handleAppError(error, {
          context: "edit_account_update_email",
          fallbackMessage: "Failed to update email.",
        })
        setLoading(false)
        return
      }

      setLoading(false)

      Alert.alert(
        "Email updated",
        "Please check your new email to confirm the change."
      )

      setNewEmail("")
      setConfirmEmail("")
      setCurrentPassword("")
    } catch (err) {
      setLoading(false)
      handleAppError(err, {
        context: "edit_account_update_email_catch",
        fallbackMessage: "Failed to update email. Please try again.",
      })
    }
  }

  /* ---------------- UPDATE PASSWORD ---------------- */

  const updatePassword = async () => {
    try {
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

      if (!session?.user) {
        handleAppError(new Error("Session missing"), {
          context: "edit_account_update_password_no_session",
          fallbackMessage: "Your session expired. Please sign in again.",
        })
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

      if (error) {
        handleAppError(error, {
          context: "edit_account_update_password",
          fallbackMessage: "Failed to update password.",
        })
        setLoading(false)
        return
      }

      setLoading(false)

      Alert.alert("Password updated", "Your password has been changed.")

      setNewPassword("")
      setConfirmPassword("")
      setCurrentPassword("")
    } catch (err) {
      setLoading(false)
      handleAppError(err, {
        context: "edit_account_update_password_catch",
        fallbackMessage: "Failed to update password. Please try again.",
      })
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Edit Account"
        backLabel="Settings"
        backRoute="/settings"
      />

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
            paddingBottom: 220,
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

  headerWrap: {
    backgroundColor: "#7FAF9B",
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F1E17",
  },

  headerBtn: {
    alignItems: "center",
    minWidth: 60,
  },

  headerSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
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
