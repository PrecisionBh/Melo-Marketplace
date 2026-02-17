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

  // Prevent setState on unmounted component
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
      Keyboard.dismiss()

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (error) {
        const msg = (error.message || "").toLowerCase()

        // Common Supabase auth UX improvements
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

      // Optional: clear inputs on success
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
      if (mountedRef.current) setLoading(false)
    }
  }

  return (
    <View style={styles.screen}>
      {/* BRANDING */}
      <View style={styles.branding}>
        <Text style={styles.brandTitle}>MELO</Text>
        <Text style={styles.subtitle}>Your Sports Only Marketplace</Text>
      </View>

      {/* CARD */}
      <View style={styles.card}>
        <Text style={styles.title}>Sign In</Text>

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

        {/* FORGOT PASSWORD LINK */}
        <TouchableOpacity
          onPress={() => router.push("/forgot-password")}
          style={{ alignSelf: "flex-end", marginBottom: 12 }}
          disabled={loading}
        >
          <Text
            style={{
              color: "#7FAF9B",
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

      {/* FOOTER */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          Partnered With Precision Sports LLC
        </Text>
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

  passwordWrapper: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#D3DED8",
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

  button: {
    backgroundColor: "#7FAF9B",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
  },

  buttonDisabled: {
    backgroundColor: "#D3DED8",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  link: {
    textAlign: "center",
    color: "#6B8F82",
  },

  linkBold: {
    fontWeight: "800",
    color: "#2E5F4F",
  },

  footerContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  footerText: {
    color: "#9DB6AC",
    fontSize: 12,
    fontWeight: "600",
  },
})
