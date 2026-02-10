import { supabase } from "@/lib/supabase"

type NotifyArgs = {
  userId: string
  type: "order" | "offer" | "message"
  title: string
  body: string
  data?: Record<string, any>
}

/**
 * Generic notification helper
 * - Inserts into notifications table (source of truth)
 * - Sends Expo push notification if token exists
 * - NEVER throws
 * - NEVER blocks business logic
 */
export async function notify({
  userId,
  type,
  title,
  body,
  data,
}: NotifyArgs) {
  try {
    if (!userId) return

    /* ---------------- SAVE IN-APP NOTIFICATION ---------------- */

    await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      data: data ?? {},
    })

    /* ---------------- FETCH EXPO PUSH TOKEN ---------------- */

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("expo_push_token, notifications_enabled")
      .eq("id", userId)
      .single()

    if (
      profileError ||
      !profile?.expo_push_token ||
      profile.notifications_enabled === false
    ) {
      return
    }

    /* ---------------- SEND EXPO PUSH ---------------- */

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: profile.expo_push_token,
        title,
        body,
        data: {
          type,
          ...data,
        },
      }),
    })
  } catch (err) {
    // Notifications must NEVER break core flows
    console.warn("[notify] failed:", err)
  }
}
