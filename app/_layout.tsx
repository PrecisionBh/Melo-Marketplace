import { StripeProvider } from "@stripe/stripe-react-native"
import * as Notifications from "expo-notifications"
import { Stack, useRouter, useSegments } from "expo-router"
import { useEffect, useRef } from "react"
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
  const router = useRouter()
  const segments = useSegments()

  // 🔥 PREVENT INFINITE LOOP
  const hasHandledInitialNotification = useRef(false)

  useEffect(() => {
    const handleNotification = (response: any) => {
      const data =
        response?.notification?.request?.content?.data

      console.log("🔔 Notification tapped:", data)

      if (!data) return

      // 🚫 PREVENT DUPLICATE NAVIGATION
      if (
        segments[0] === "messages" &&
        segments[1] === data?.conversationId
      ) {
        return
      }

      // 🔥 NEW SYSTEM
      if (data?.conversationId) {
        router.push({
          pathname: "/messages/[id]",
          params: {
            id: data.conversationId,
            listingId: data.listingId ?? null,
          },
        })
        return
      }

      // 🔥 LEGACY FIX
      if (data?.params?.id) {
        router.push({
          pathname: "/messages/[id]",
          params: {
            id: data.params.id,
          },
        })
        return
      }

      // ⚠️ fallback
      if (data?.route) {
        router.push(data.route)
      }
    }

    // 🔥 FOREGROUND / BACKGROUND
    const sub =
      Notifications.addNotificationResponseReceivedListener(
        handleNotification
      )

    // 🔥 APP CLOSED (RUN ONCE ONLY)
    const checkInitial = async () => {
      if (hasHandledInitialNotification.current) return

      const response =
        await Notifications.getLastNotificationResponseAsync()

      if (response) {
        console.log("📬 Opened from notification (initial)")
        handleNotification(response)
      }

      hasHandledInitialNotification.current = true
    }

    checkInitial()

    return () => sub.remove()
  }, [segments])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider
        publishableKey={
          process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!
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

              {/* 🔥 REQUIRED FOR DYNAMIC ROUTING */}
              <Stack.Screen name="messages/[id]" />
            </Stack>
          </CartProvider>
        </AuthProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  )
}