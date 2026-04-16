import { StripeProvider } from "@stripe/stripe-react-native"
import { Stack, useRouter, useSegments } from "expo-router"
import { useEffect } from "react"
import {
  ActivityIndicator,
  I18nManager,
  View,
} from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"

import { AuthProvider, useAuth } from "../context/AuthContext"
import { CartProvider } from "../context/CartContext"

/* 🔥 FORCE LTR (GLOBAL FIX) */
I18nManager.allowRTL(false)
I18nManager.forceRTL(false)

function AuthGate() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return

    const inAuthGroup =
      segments[0] === "signinscreen" ||
      segments[0] === "register" ||
      segments[0] === "forgot-password" ||
      segments[0] === "verify-otp" ||
      segments[0] === "reset-password"

    if (session && inAuthGroup) {
      router.replace("/home")
    }
  }, [session, segments, loading])

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    )
  }

  return null
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider
        publishableKey={
          process.env
            .EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!
        }
      >
        <AuthProvider>
          <CartProvider>
            <AuthGate />

            <Stack
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="signinscreen" />
              <Stack.Screen name="register" />
              <Stack.Screen name="forgot-password" />
              <Stack.Screen name="verify-otp" />
              <Stack.Screen name="reset-password" />
              <Stack.Screen name="home" />
            </Stack>
          </CartProvider>
        </AuthProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  )
}