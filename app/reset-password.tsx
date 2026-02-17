import * as Linking from "expo-linking"
import { useRouter } from "expo-router"
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
import { handleAppError } from "../lib/errors/appError"
import { supabase } from "../lib/supabase"

export default function ResetPasswordScreen() {
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  const isValid =
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    password === confirmPassword

  /* ---------------- DEEP LINK SESSION HANDLING (PRODUCTION SAFE) ---------------- */

  useEffect(() => {
    let subscription: any

    const processUrl = async (url: string | null) => {
      try {
        if (!url) {
          setSessionReady(true)
          return
        }

        // Supabase recovery tokens are in the HASH fragment
        const hashIndex = url.indexOf("#")
        if (hashIndex === -1) {
          setSessionReady(true)
          return
        }

        const fragment = url.substring(hashIndex + 1)
        if (!fragment) {
          setSessionReady(true)
          return
        }

        // Manual parsing (React Native safe)
        const params: Record<string, string> = {}
        fragment.split("&").forEach((pair) => {
          const [key, value] = pair.split("=")
          if (key && value) {
            params[key] = decodeURIComponent(value)
          }
        })

        const access_token = params["access_token"]
        const refresh_token = params["refresh_token"]

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })

          if (error) {
            throw error
          }
        }
      } catch (err) {
        handleAppError(err, {
          context: "password_reset_session",
          fallbackMessage:
            "This reset link may have expired. Please request a new one.",
        })
      } finally {
        setSessionReady(true)
      }
    }

    const init = async () => {
      const initialUrl = await Linking.getInitialURL()
      await processUrl(initialUrl)
    }

    init()

    // Listen for incoming links while app is open (important for Android)
    subscription = Linking.addEventListener("url", ({ url }) => {
      processUrl(url)
    })

    return () => {
      subscription?.remove?.()
    }
  }, [])

  /* ---------------- RESET PASSWORD ---------------- */

  const handleResetPassword = async () => {
    if (!isValid || loading) return

    try {
      setLoading(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        Alert.alert(
          "Session Expired",
          "Your reset session expired. Please request a new password reset link."
        )
        return
      }

      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        throw error
      }

      Alert.alert(
        "Password Updated",
        "Your password has been successfully changed. Please sign in.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/signinscreen"),
          },
        ]
      )
    } catch (err) {
      handleAppError(err, {
        context: "password_reset",
        fallbackMessage:
          "Failed to update password. Please try the reset link again.",
      })
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- LOADING STATE ---------------- */

  if (!sessionReady) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color="#7FAF9B" />
      </View>
    )
  }

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.screen}>
      {/* BRANDING */}
      <View style={styles.branding}>
        <Text style={styles.brandTitle}>MELO</Text>
        <Text style={styles.subtitle}>Secure Password Reset</Text>
      </View>

      {/* CARD */}
      <View style={styles.card}>
        <Text style={styles.title}>Create New Password</Text>

        <TextInput
          style={styles.input}
          placeholder="New Password"
          placeholderTextColor="#6B8F82"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm New Password"
          placeholderTextColor="#6B8F82"
          secureTextEntry={!showPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
        />

        <TouchableOpacity
          onPress={() => setShowPassword((p) => !p)}
          disabled={loading}
        >
          <Text style={styles.showText}>
            {showPassword ? "Hide Password" : "Show Password"}
          </Text>
        </TouchableOpacity>

        {confirmPassword.length > 0 && password !== confirmPassword && (
          <Text style={styles.error}>Passwords do not match</Text>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            (!isValid || loading) && styles.buttonDisabled,
          ]}
          onPress={handleResetPassword}
          disabled={!isValid || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  branding: {
    alignItems: "center",
    marginBottom: 28,
    transform: [{ translateY: -40 }],
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#2E5F4F",
    letterSpacing: 2,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#6B8F82",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
    color: "#2E5F4F",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D3DED8",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#0F1E17",
    marginBottom: 12,
  },
  showText: {
    textAlign: "right",
    color: "#7FAF9B",
    fontWeight: "700",
    marginBottom: 10,
  },
  error: {
    color: "#D64545",
    fontSize: 13,
    marginBottom: 10,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#7FAF9B",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#D3DED8",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
})
