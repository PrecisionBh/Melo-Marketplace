import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useState } from "react"
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { handleAppError } from "../lib/errors/appError"
import { supabase } from "../lib/supabase"

export default function RegisterScreen() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const normalizedEmail = email.trim().toLowerCase()

  const isFormValid =
    normalizedEmail.length > 0 &&
    password.length >= 6 &&
    password === confirmPassword

  const handleCreateAccount = async () => {
    if (!isFormValid || loading) return

    try {
      setLoading(true)

      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      })

      if (error) {
        // Known auth errors handled cleanly for UX
        if (error.message?.toLowerCase().includes("already registered")) {
          Alert.alert(
            "Account Exists",
            "An account with this email already exists. Please sign in instead."
          )
          return
        }

        if (error.message?.toLowerCase().includes("invalid email")) {
          Alert.alert(
            "Invalid Email",
            "Please enter a valid email address."
          )
          return
        }

        throw error
      }

      // Auth trigger handles profile + wallet creation (as designed in Melo)
      Alert.alert(
        "Account Created",
        "Your account has been created successfully."
      )

      router.replace("/")
    } catch (err) {
      handleAppError(err, {
        context: "auth_register",
        fallbackMessage:
          "Signup failed. Please check your connection and try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />

      <View style={styles.passwordWrapper}>
        <TextInput
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          style={styles.passwordInput}
        />

        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeButton}
          disabled={loading}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={20}
            color="#777"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.passwordWrapper}>
        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor="#999"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          style={styles.passwordInput}
        />

        <TouchableOpacity
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={styles.eyeButton}
          disabled={loading}
        >
          <Ionicons
            name={showConfirmPassword ? "eye-off" : "eye"}
            size={20}
            color="#777"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.createButton,
          !isFormValid && styles.buttonDisabled,
          loading && { opacity: 0.6 },
        ]}
        onPress={handleCreateAccount}
        disabled={!isFormValid || loading}
      >
        <Text style={styles.createText}>
          {loading ? "Creating..." : "Create Account"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          if (loading) return
          router.replace("/signinscreen")
        }}
      >
        <Text style={styles.backText}>
          Already have an account?{" "}
          <Text style={styles.link}>Sign in</Text>
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const SAGE = "#8FAF9A"

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#222",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  passwordWrapper: {
    position: "relative",
    marginBottom: 14,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    paddingRight: 44,
    fontSize: 16,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -10 }],
  },
  createButton: {
    backgroundColor: SAGE,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#D3DED8",
  },
  createText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backText: {
    textAlign: "center",
    marginTop: 22,
    fontSize: 14,
    color: "#666",
  },
  link: {
    color: SAGE,
    fontWeight: "600",
  },
})
