import KeyboardWrapper from "@/components/KeyboardWrapper"
import { useRouter } from "expo-router"
import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { handleAppError } from "../lib/errors/appError"
import { supabase } from "../lib/supabase"

export default function SignInScreen() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bannedMessage, setBannedMessage] = useState<string | null>(null)

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const normalizedEmail = email.trim().toLowerCase()
  const isFormValid = normalizedEmail.length > 0 && password.length > 0

  const handleEmailLogin = async () => {
    if (!isFormValid || loading) return

    try {
      setLoading(true)
      setBannedMessage(null)
      Keyboard.dismiss()

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (error) {
        const msg = (error.message || "").toLowerCase()

        if (msg.includes("email not confirmed")) {
          Alert.alert(
            "Confirm your email",
            "Please check your inbox and confirm your email before signing in."
          )
          return
        }

        if (
          msg.includes("invalid login credentials") ||
          msg.includes("invalid") ||
          msg.includes("credentials")
        ) {
          Alert.alert("Sign in failed", "Email or password is incorrect.")
          return
        }

        throw error
      }

      const userId = data?.user?.id

      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_banned")
          .eq("id", userId)
          .single()

        if (profile?.is_banned === true) {
          await supabase.auth.signOut()

          if (mountedRef.current) {
            setBannedMessage(
              "This account has been banned for not following our terms and policies."
            )
            setLoading(false)
          }

          return
        }
      }

      if (mountedRef.current) {
        setEmail("")
        setPassword("")
      }

      router.replace("/home")
    } catch (err) {
      handleAppError(err, {
        fallbackMessage: "Sign in failed. Please try again.",
      })
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  return (
    <KeyboardWrapper contentContainerStyle={styles.screen}>
      <View style={styles.branding}>
        <Text style={styles.brandTitle}>MELO</Text>
        <Text style={styles.subtitle}>Your Sports Only Marketplace</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Sign In</Text>

        {bannedMessage && (
          <View style={styles.bannedBox}>
            <Text style={styles.bannedText}>{bannedMessage}</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6B8F82"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
        />

        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#6B8F82"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={handleEmailLogin}
          />

          <TouchableOpacity
            onPress={() => setShowPassword((p) => !p)}
            disabled={loading}
          >
            <Text style={styles.eye}>{showPassword ? "🙈" : "👁️"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/forgot-password")}
          style={{ alignSelf: "flex-end", marginBottom: 12 }}
          disabled={loading}
        >
          <Text
            style={{
              color: "#D97732",
              fontWeight: "700",
              fontSize: 13,
            }}
          >
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            !isFormValid && styles.buttonDisabled,
            loading && { opacity: 0.6 },
          ]}
          onPress={handleEmailLogin}
          disabled={!isFormValid || loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/register")}
          disabled={loading}
        >
          <Text style={styles.link}>
            Don’t have an account?{" "}
            <Text style={styles.linkBold}>Create one</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          Partnered With Precision Sports LLC
        </Text>
      </View>
    </KeyboardWrapper>
  )
}

const MELO_ORANGE = "#D97732"
const MELO_ORANGE_DARK = "#C46528"

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    justifyContent: "flex-start",
  },

  branding: {
    alignItems: "center",
    marginBottom: 28,
  },

  brandTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#111", // 🔥 cleaner neutral
    letterSpacing: 2,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
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
    marginBottom: 12,
    textAlign: "center",
    color: "#111", // 🔥 neutral title
  },

  bannedBox: {
    backgroundColor: "#FFE5E5",
    borderWidth: 1,
    borderColor: "#FF4D4D",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },

  bannedText: {
    color: "#B00020",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#0F1E17",
    marginBottom: 12,
  },

  passwordWrapper: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 18,
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#0F1E17",
  },

  eye: {
    paddingHorizontal: 14,
    fontSize: 16,
  },

  // 🔥 MAIN CTA BUTTON
  button: {
    backgroundColor: MELO_ORANGE,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
  },

  buttonDisabled: {
    backgroundColor: "#E5E7EB",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  // 🔥 LINKS UPDATED TO ORANGE
  link: {
    textAlign: "center",
    color: "#6B7280",
  },

  linkBold: {
    fontWeight: "800",
    color: MELO_ORANGE,
  },

  footerContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  footerText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },
})