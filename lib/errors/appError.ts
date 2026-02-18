import { Alert } from "react-native"

type AppErrorOptions = {
  fallbackMessage?: string
  showTechnical?: boolean

  // ✅ Additions (non-breaking)
  context?: string
  silent?: boolean
}

/** Prevents alert-spam loops */
let isShowingError = false

/** Normalizes weird error shapes into something consistent */
function normalizeError(error: any): { message: string; code?: string } {
  if (!error) return { message: "Unknown error" }

  // Already a string
  if (typeof error === "string") {
    return { message: error }
  }

  // Supabase / general Error shape
  if (error?.message) {
    return { message: String(error.message), code: error.code }
  }

  // Some APIs use error_description
  if (error?.error_description) {
    return { message: String(error.error_description) }
  }

  // Some return { error: "..." }
  if (typeof error?.error === "string") {
    return { message: error.error }
  }

  // Fallback stringify
  try {
    return { message: JSON.stringify(error) }
  } catch {
    return { message: "Unknown error" }
  }
}

/**
 * Converts raw technical errors into user-friendly messages
 */
function getUserFriendlyMessage(error: any, fallback?: string): string {
  const normalized = normalizeError(error)
  const raw = normalized.message || ""
  const message = String(raw).toLowerCase()

  // 🧠 CRITICAL FIX: Ignore intentional logout / navigation session loss
  // This prevents scary alerts like:
  // "Missing session" when user logs out (which is NORMAL behavior)
  if (
    message.includes("missing session") ||
    message.includes("no session")
  ) {
    return "" // Silent UX (still logged in console for dev)
  }

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

  // 💳 Stripe / Payment Errors (Enhanced for Melo)
  if (
    message.includes("stripe") ||
    message.includes("payment") ||
    message.includes("card") ||
    message.includes("checkout") ||
    message.includes("payment_intent") ||
    message.includes("payout") ||
    message.includes("transfer")
  ) {
    return "Payment processing failed. Please try again."
  }

  // 🧾 Supabase / Database Errors
  if (
    message.includes("supabase") ||
    message.includes("database") ||
    message.includes("row level security") ||
    message.includes("permission") ||
    message.includes("rls")
  ) {
    return "Server error. Please try again in a moment."
  }

  // 🔐 REAL Auth Errors (NOT logout)
  if (
    message.includes("auth") ||
    message.includes("jwt") ||
    message.includes("token has expired") ||
    message.includes("invalid login credentials")
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
  const normalized = normalizeError(error)
  const messageLower = (normalized.message || "").toLowerCase()

  console.error("🚨 MELO APP ERROR:", {
    context: options?.context || "unknown",
    message: normalized.message,
    code: normalized.code,
    raw: error,
  })

  // 🧠 SECOND LAYER SAFETY:
  // Completely suppress alerts for expected session loss (logout, deep link, nav reset)
  if (
    messageLower.includes("missing session") ||
    messageLower.includes("no session")
  ) {
    return
  }

  // Silent errors (background systems like wallet sync / polling)
  if (options?.silent) return

  const userMessage = getUserFriendlyMessage(error, options?.fallbackMessage)

  // If message is intentionally empty (like logout), do nothing
  if (!userMessage) return

  // Prevent stacked Alert spam
  if (isShowingError) return
  isShowingError = true

  // Optional: show tech details in dev if requested
  const tech =
    options?.showTechnical && normalized.message
      ? `\n\nDetails: ${normalized.message}`
      : ""

  Alert.alert("Error", `${userMessage}${tech}`, [
    {
      text: "OK",
      onPress: () => {
        isShowingError = false
      },
    },
  ])
}
