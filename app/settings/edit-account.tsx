import GlobalFooter from "@/components/global/globalfooter"
import GlobalHeader from "@/components/global/globalheader"

import { useAuth } from "../../context/AuthContext"
import { handleAppError } from "../../lib/errors/appError"
import { supabase } from "../../lib/supabase"

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

export default function EditAccountScreen() {
  const { session } = useAuth()

  const userEmail = session?.user?.email ?? ""

  const [currentPassword, setCurrentPassword] =
    useState("")

  const [newEmail, setNewEmail] =
    useState("")
  const [confirmEmail, setConfirmEmail] =
    useState("")

  const [newPassword, setNewPassword] =
    useState("")
  const [confirmPassword, setConfirmPassword] =
    useState("")

  const [loading, setLoading] =
    useState(false)

  const reauthenticate = async () => {
    try {
      if (!userEmail || !currentPassword) {
        Alert.alert(
          "Missing Password",
          "Please enter your current password."
        )
        return false
      }

      const { error } =
        await supabase.auth.signInWithPassword({
          email: userEmail,
          password: currentPassword,
        })

      if (error) {
        handleAppError(error, {
          fallbackMessage:
            "Current password is incorrect.",
        })
        return false
      }

      return true
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Authentication failed.",
      })
      return false
    }
  }

  const handleSave = async () => {
    try {
      if (
        !newEmail &&
        !newPassword
      ) {
        Alert.alert(
          "Nothing To Update",
          "Enter a new email or password first."
        )
        return
      }

      setLoading(true)

      const ok =
        await reauthenticate()

      if (!ok) {
        setLoading(false)
        return
      }

      /* EMAIL */
      if (newEmail) {
        if (
          newEmail !== confirmEmail
        ) {
          Alert.alert(
            "Email Mismatch",
            "Emails do not match."
          )
          setLoading(false)
          return
        }

        const { error } =
          await supabase.auth.updateUser({
            email: newEmail.trim(),
          })

        if (error) throw error
      }

      /* PASSWORD */
      if (newPassword) {
        if (
          newPassword.length < 6
        ) {
          Alert.alert(
            "Invalid Password",
            "Password must be at least 6 characters."
          )
          setLoading(false)
          return
        }

        if (
          newPassword !==
          confirmPassword
        ) {
          Alert.alert(
            "Password Mismatch",
            "Passwords do not match."
          )
          setLoading(false)
          return
        }

        const { error } =
          await supabase.auth.updateUser({
            password: newPassword,
          })

        if (error) throw error
      }

      Alert.alert(
        "Success",
        "Account updated successfully."
      )

      setCurrentPassword("")
      setNewEmail("")
      setConfirmEmail("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      handleAppError(err, {
        fallbackMessage:
          "Failed to update account.",
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
          showsVerticalScrollIndicator={
            false
          }
        >
          <Text style={styles.pageTitle}>
            Edit Account
          </Text>

          <View style={styles.card}>
            <Text
              style={styles.sectionTitle}
            >
              Security Verification
            </Text>

            <TextInput
              value={
                currentPassword
              }
              onChangeText={
                setCurrentPassword
              }
              secureTextEntry
              placeholder="Current Password"
              style={styles.input}
            />
          </View>

          <View style={styles.card}>
            <Text
              style={styles.sectionTitle}
            >
              Change Email
            </Text>

            <TextInput
              value={newEmail}
              onChangeText={
                setNewEmail
              }
              placeholder="New Email"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />

            <TextInput
              value={confirmEmail}
              onChangeText={
                setConfirmEmail
              }
              placeholder="Confirm New Email"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          <View style={styles.card}>
            <Text
              style={styles.sectionTitle}
            >
              Change Password
            </Text>

            <TextInput
              value={newPassword}
              onChangeText={
                setNewPassword
              }
              placeholder="New Password"
              secureTextEntry
              style={styles.input}
            />

            <TextInput
              value={
                confirmPassword
              }
              onChangeText={
                setConfirmPassword
              }
              placeholder="Confirm New Password"
              secureTextEntry
              style={styles.input}
            />
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={loading}
          >
            <Text
              style={styles.saveText}
            >
              {loading
                ? "Saving..."
                : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <GlobalFooter />
    </View>
  )
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#F8F8F8",
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
      backgroundColor:
        "#fff",
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "#E8E8E8",
      padding: 18,
      marginBottom: 16,
    },

    sectionTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: "#111",
      marginBottom: 14,
    },

    input: {
      backgroundColor:
        "#F9FAFB",
      borderWidth: 1,
      borderColor: "#E5E7EB",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 14,
      marginBottom: 12,
    },

    saveBtn: {
      backgroundColor:
        "#D97732",
      height: 54,
      borderRadius: 18,
      alignItems: "center",
      justifyContent:
        "center",
      marginTop: 8,
    },

    saveText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 15,
    },
  })