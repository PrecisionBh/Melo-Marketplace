import KeyboardWrapper from "@/components/KeyboardWrapper"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Alert,
  Animated,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const glowAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(1)).current

  const normalizedEmail = email.trim().toLowerCase()

  // 🔥 EMAIL VALIDATION
  const isValidEmail = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  }, [normalizedEmail])

  const passwordsMatch = useMemo(
    () => password.length > 0 && password === confirmPassword,
    [password, confirmPassword]
  )

  const passwordLongEnough = password.length > 6

  const isFormValid =
    isValidEmail &&
    passwordLongEnough &&
    passwordsMatch

  useEffect(() => {
    if (isFormValid) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start()
    } else {
      glowAnim.stopAnimation()
      glowAnim.setValue(0)
    }
  }, [isFormValid])

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start()
  }

  const handleCreateAccount = async () => {
    if (!isFormValid || loading) return

    // 🔥 HARD GUARD
    if (!isValidEmail) {
      setErrorMessage("Please enter a valid email address.")
      return
    }

    try {
      setLoading(true)
      setErrorMessage(null)

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, is_banned")
        .eq("email", normalizedEmail)
        .maybeSingle()

      if (existingProfile?.is_banned === true) {
        setErrorMessage(
          "This account has been banned for not following our terms and policies."
        )
        return
      }

      if (existingProfile) {
        setErrorMessage(
          "An account with this email already exists. Please sign in instead."
        )
        return
      }

      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      })

      if (error) throw error

      Alert.alert(
        "Account Created",
        "Your account has been created successfully."
      )

      router.replace("/home")
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

  const glowShadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 28],
  })

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.9],
  })

  const showMatchIndicator = confirmPassword.length > 0

  return (
    <KeyboardWrapper contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <TextInput
          placeholder="Email"
          placeholderTextColor="#000000"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        {/* 🔥 LIVE EMAIL FEEDBACK */}
        {email.length > 0 && !isValidEmail && (
          <Text style={styles.inlineError}>
            Enter a valid email address
          </Text>
        )}

        <View style={styles.passwordWrapper}>
          <TextInput
            placeholder="Password (min 7 characters)"
            placeholderTextColor="#000000"
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
            placeholderTextColor="#000000"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            style={styles.passwordInput}
          />
          <TouchableOpacity
            onPress={() =>
              setShowConfirmPassword(!showConfirmPassword)
            }
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

        {showMatchIndicator && (
          <Text
            style={[
              styles.matchText,
              passwordsMatch ? styles.matchGreen : styles.matchRed,
            ]}
          >
            {passwordsMatch
              ? "✓ Passwords match"
              : "✗ Passwords do not match"}
          </Text>
        )}

        <Animated.View
          style={[
            styles.glowWrapper,
            isFormValid && {
              shadowColor: "#D97732",
              shadowOpacity: glowOpacity,
              shadowRadius: glowShadowRadius,
              shadowOffset: { width: 0, height: 0 },
              elevation: 30,
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[
                styles.createButton,
                isFormValid
                  ? styles.createButtonActive
                  : styles.buttonDisabled,
              ]}
              onPress={handleCreateAccount}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={!isFormValid || loading}
              activeOpacity={0.9}
            >
              <Text style={styles.createText}>
                {loading ? "Creating..." : "Create Account"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

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
    </KeyboardWrapper>
  )
}

const MELO_ORANGE = "#D97732"

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 28,
    paddingTop: 80,
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
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    marginBottom: 20,
    textAlign: "center",
  },

  errorBox: {
    backgroundColor: "#FFE5E5",
    borderWidth: 1,
    borderColor: "#FF4D4D",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },

  errorText: {
    color: "#B00020",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  inlineError: {
    color: "#D64545",
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 4,
  },

  matchText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    marginLeft: 4,
  },

  matchGreen: {
    color: "#1F9D6A",
  },

  matchRed: {
    color: "#D64545",
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 6,
  },

  passwordWrapper: {
    position: "relative",
    marginBottom: 4,
  },

  passwordInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
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

  glowWrapper: {
    width: "100%",
    borderRadius: 16,
  },

  createButton: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  createButtonActive: {
    backgroundColor: MELO_ORANGE,
  },

  buttonDisabled: {
    backgroundColor: "#CFCFCF",
  },

  createText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  backText: {
    textAlign: "center",
    marginTop: 22,
    fontSize: 14,
    color: "#666",
  },

  link: {
    color: MELO_ORANGE,
    fontWeight: "600",
  },
})