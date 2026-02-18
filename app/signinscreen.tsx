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
    console.log("[AUTH] SignInScreen mounted")
    mountedRef.current = true

    return () => {
      console.log("[AUTH] SignInScreen unmounted")
      mountedRef.current = false
    }
  }, [])

  const normalizedEmail = email.trim().toLowerCase()
  const isFormValid = normalizedEmail.length > 0 && password.length > 0

  const handleEmailLogin = async () => {
    console.log("[AUTH] Sign in button pressed")
    console.log("[AUTH] Raw email input:", email)
    console.log("[AUTH] Normalized email:", normalizedEmail)
    console.log("[AUTH] Form valid:", isFormValid)
    console.log("[AUTH] Current loading state:", loading)

    if (!isFormValid || loading) {
      console.log("[AUTH] Login blocked - invalid form or already loading")
      return
    }

    try {
      console.log("[AUTH] Starting login process...")
      setLoading(true)
      Keyboard.dismiss()

      console.log("[AUTH] Calling supabase.auth.signInWithPassword...")

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      console.log("[AUTH] Supabase response received")
      console.log("[AUTH] Session user:", data?.user?.id ?? "NO USER")
      console.log("[AUTH] Session exists:", !!data?.session)
      console.log("[AUTH] Error object:", error)

      if (error) {
        console.log("[AUTH] Login error message:", error.message)
        const msg = (error.message || "").toLowerCase()

        // Common Supabase auth UX improvements
        if (msg.includes("email not confirmed")) {
          console.log("[AUTH] Email not confirmed case triggered")
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
          console.log("[AUTH] Invalid credentials detected")
          Alert.alert("Sign in failed", "Email or password is incorrect.")
          return
        }

        console.log("[AUTH] Throwing unexpected auth error")
        throw error
      }

      console.log("[AUTH] Login SUCCESS - clearing inputs")

      // Optional: clear inputs on success
      if (mountedRef.current) {
        setEmail("")
        setPassword("")
      } else {
        console.log("[AUTH] Component unmounted before clearing inputs")
      }

      console.log("[AUTH] Navigating to /home with router.replace")
      router.replace("/home")
    } catch (err) {
      console.log("[AUTH] CATCH BLOCK TRIGGERED")
      console.log("[AUTH] Error:", err)
      handleAppError(err, {
        fallbackMessage: "Sign in failed. Please try again.",
      })
    } finally {
      console.log("[AUTH] Login finally block - stopping loader")
      if (mountedRef.current) {
        setLoading(false)
      } else {
        console.log("[AUTH] Skipped setLoading(false) because unmounted")
      }
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
          onChangeText={(text) => {
            console.log("[AUTH] Email input changed:", text)
            setEmail(text)
          }}
          returnKeyType="next"
        />

        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#6B8F82"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(text) => {
              console.log("[AUTH] Password input length:", text.length)
              setPassword(text)
            }}
            returnKeyType="done"
            onSubmitEditing={handleEmailLogin}
          />

          <TouchableOpacity
            onPress={() => {
              console.log("[AUTH] Toggle password visibility")
              setShowPassword((p) => !p)
            }}
            disabled={loading}
          >
            <Text style={styles.eye}>{showPassword ? "🙈" : "👁️"}</Text>
          </TouchableOpacity>
        </View>

        {/* FORGOT PASSWORD LINK */}
        <TouchableOpacity
          onPress={() => {
            console.log("[AUTH] Navigating to forgot password")
            router.push("/forgot-password")
          }}
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
          onPress={() => {
            console.log("[AUTH] Navigating to register")
            router.push("/register")
          }}
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
