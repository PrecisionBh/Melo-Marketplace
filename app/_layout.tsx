import { StripeProvider } from "@stripe/stripe-react-native"
import { Stack } from "expo-router"
import { AuthProvider } from "../context/AuthContext"

export default function RootLayout() {
  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
    >
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="signinscreen" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthProvider>
    </StripeProvider>
  )
}
