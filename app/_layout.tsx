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

function NotificationRouter() {
  const router = useRouter()
  const { session, loading } = useAuth()

  const hasHandledInitial = useRef(false)

  const routeFromData = (data: any) => {
    if (!data || typeof data !== "object") return

    console.log("🔔 Routing from notification:", data)

    // 🔥 OFFERS → ROUTE TO INDEX
    if (
      data.route === "/offers/[id]" ||
      data.type?.includes("offer")
    ) {
      router.replace("/offers")
      return
    }

    // 🔥 MESSAGES
    if (data.conversationId) {
      router.replace("/messages")
      return
    }

    // 🔥 FALLBACK
    if (data.route) {
      router.replace(data.route)
    }
  }

  // 🔥 FOREGROUND / BACKGROUND
  useEffect(() => {
    const sub =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          if (loading || !session) return

          const data =
            response?.notification?.request?.content?.data

          routeFromData(data)
        }
      )

    return () => sub.remove()
  }, [loading, session])

  // 🔥 COLD START
  useEffect(() => {
    if (loading) return
    if (!session) return
    if (hasHandledInitial.current) return

    hasHandledInitial.current = true

    const run = async () => {
      const response =
        await Notifications.getLastNotificationResponseAsync()

      const data =
        response?.notification?.request?.content?.data

      if (!data) return

      // 🔥 slight delay = prevents navigation race issues
      setTimeout(() => {
        routeFromData(data)
      }, 300)
    }

    run()
  }, [loading, session])

  return null
}

export default function RootLayout() {
  // 🔥 NOTIFICATION DISPLAY HANDLER
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })
  }, [])

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
            <NotificationRouter />

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
              <Stack.Screen name="messages/[id]" />
              <Stack.Screen name="offers/index" />
            </Stack>
          </CartProvider>
        </AuthProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  )
}