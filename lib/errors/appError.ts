import { Alert } from "react-native"

type AppErrorOptions = {
  fallbackMessage?: string
  showTechnical?: boolean
}

/**
 * Converts raw technical errors into user-friendly messages
 */
function getUserFriendlyMessage(error: any, fallback?: string): string {
  const raw = error?.message || error?.error || ""
  const message = String(raw).toLowerCase()

  // 💰 Wallet / Balance Errors
  if (
    message.includes("insufficient") ||
    message.includes("balance") ||
    message.includes("not enough funds")
  ) {
    return "Insufficient balance to complete this action."
  }

  // 🌐 Network / Fetch Errors
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout") ||
    message.includes("failed to fetch")
  ) {
    return "Network error. Please check your connection and try again."
  }

  // 💳 Stripe / Payment Errors
  if (
    message.includes("stripe") ||
    message.includes("payment") ||
    message.includes("card") ||
    message.includes("checkout")
  ) {
    return "Payment failed. Please try again."
  }

  // 🧾 Supabase / Database Errors
  if (
    message.includes("supabase") ||
    message.includes("database") ||
    message.includes("row level security") ||
    message.includes("permission")
  ) {
    return "Server error. Please try again in a moment."
  }

  // 🔐 Auth Errors
  if (
    message.includes("auth") ||
    message.includes("jwt") ||
    message.includes("session")
  ) {
    return "Your session expired. Please sign in again."
  }

  // 📦 Storage / Upload Errors
  if (
    message.includes("storage") ||
    message.includes("upload") ||
    message.includes("file")
  ) {
    return "Upload failed. Please try again."
  }

  // Default
  return fallback || "Something went wrong. Please try again."
}

/**
 * GLOBAL APP ERROR HANDLER (Use this everywhere)
 */
export function handleAppError(error: any, options?: AppErrorOptions) {
  console.error("🚨 MELO APP ERROR:", error)

  const userMessage = getUserFriendlyMessage(
    error,
    options?.fallbackMessage
  )

  Alert.alert("Error", userMessage)
}
