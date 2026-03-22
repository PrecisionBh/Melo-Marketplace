import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  try {
    console.log("🔥 send-notification HIT")

    const {
      userId,
      type,
      title,
      body,
      data,
      dedupeKey,
    } = await req.json()

    console.log("📦 payload:", { userId, type, title, body, data, dedupeKey })

    if (!userId || !type) {
      console.log("❌ missing required fields")
      return new Response("Missing fields", { status: 400 })
    }

    /* ---------------- INSERT (SAFE) ---------------- */

    console.log("📤 inserting notification")

    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      data: {
        ...data,
        dedupeKey,
      },
    })

    if (error) {
      // 🔥 CRITICAL: do NOT break on duplicate
      if (error.code === "23505") {
        console.log("🚫 duplicate notification blocked (expected)")
      } else {
        console.log("❌ real insert error:", error)
      }
    } else {
      console.log("✅ notification inserted")
    }

    /* ---------------- PUSH ---------------- */

    console.log("🔍 fetching profile for push")

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("expo_push_token, notifications_enabled")
      .eq("id", userId)
      .single()

    console.log("👤 profile:", profile, profileError)

    if (
      profile?.expo_push_token &&
      profile.notifications_enabled !== false
    ) {
      console.log("📡 sending push to:", profile.expo_push_token)

      const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: profile.expo_push_token,
          title,
          body,
          data,
        }),
      })

      const pushJson = await pushRes.json()
      console.log("📨 push response:", pushJson)
    } else {
      console.log("⚠️ no push token or notifications disabled")
    }

    console.log("✅ send-notification COMPLETE")

    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error("💥 FUNCTION CRASH:", err)
    return new Response("Error", { status: 500 })
  }
})