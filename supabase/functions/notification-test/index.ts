import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// 🔥 ENV VARS
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// 🔒 ONLY ALLOWED TEST USERS (you can still click it)
const ALLOWED_USERS = [
  "a046a185-5c3d-479f-8cd7-38ebb6abc5b6", // you
  "dfa9322e-baeb-4f07-8231-82521d191b4b", // wife
]

// 🔥 FORCE TARGET (YOUR WIFE)
const TEST_TARGET_USER_ID = "dfa9322e-baeb-4f07-8231-82521d191b4b"

serve(async (req) => {
  try {
    console.log("🚀 notification-test triggered")

    const body = await req.json()
    console.log("📦 Incoming body:", body)

    const { userId } = body

    if (!userId) {
      console.log("❌ Missing userId")
      return new Response("Missing userId", { status: 400 })
    }

    // 🔒 Only allow you to trigger it
    if (!ALLOWED_USERS.includes(userId)) {
      console.log("🚫 Blocked user:", userId)
      return new Response("Not allowed", { status: 403 })
    }

    console.log("📤 Triggering REAL notification system...")
    console.log("🎯 FORCED TARGET USER:", TEST_TARGET_USER_ID)

    // 🔥 CALL YOUR REAL SYSTEM (SEND TO HER)
    const notifRes = await fetch(
      `${SUPABASE_URL}/functions/v1/send-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          userId: TEST_TARGET_USER_ID, // 🔥 ALWAYS HER
          type: "order",
          title: "Test Purchase Successful",
          body: "This is a REAL test notification from Melo.",
          data: {
            route: `/orders/test`,
          },
          dedupeKey: `test-buy-${Date.now()}`,
          email: true, // 🔥 triggers Resend
        }),
      }
    )

    const notifText = await notifRes.text()

    console.log("📲 Notification status:", notifRes.status)
    console.log("📲 Notification response:", notifText)

    console.log("✅ notification-test COMPLETE")

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    )

  } catch (err) {
    console.error("❌ notification-test error:", err)

    return new Response("Server error", { status: 500 })
  }
})