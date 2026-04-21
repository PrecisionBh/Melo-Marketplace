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
      email,
    } = await req.json()

    console.log("📦 payload:", {
      userId,
      type,
      title,
      body,
      data,
      dedupeKey,
      email,
    })

    if (!userId || !type || !title || !body) {
      console.log("❌ missing required fields")
      return new Response("Missing fields", { status: 400 })
    }

    /* ---------------- INSERT ---------------- */

    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      data,
      dedupe_key: dedupeKey,
    })

    if (error && (error as any).code !== "23505") {
      console.log("❌ insert error:", error)
      return new Response("Insert failed", { status: 500 })
    }

    if ((error as any)?.code === "23505") {
      console.log("🚫 duplicate notification blocked")
      return new Response("Duplicate", { status: 200 })
    }

    console.log("✅ notification inserted")

    /* ---------------- FETCH PROFILE ---------------- */

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("expo_push_token, notifications_enabled, email")
      .eq("id", userId)
      .single()

    if (profileErr || !profile) {
      console.log("❌ profile fetch failed:", profileErr)
      return new Response("Profile fetch failed", { status: 500 })
    }

    console.log("👤 profile:", profile)

    /* ---------------- PUSH ---------------- */

    try {
      if (
        profile.expo_push_token &&
        profile.notifications_enabled !== false
      ) {
        console.log("📡 sending push to:", profile.expo_push_token)

        const pushRes = await fetch(
          "https://exp.host/--/api/v2/push/send",
          {
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
          }
        )

        const pushJson = await pushRes.json()

        if (!pushRes.ok) {
          console.log("❌ push failed:", pushJson)
        } else {
          console.log("📨 push success:", pushJson)
        }
      } else {
        console.log("⚠️ no push token or notifications disabled")
      }
    } catch (pushErr) {
      console.log("⚠️ PUSH CRASHED:", pushErr)
    }

    /* ---------------- EMAIL ---------------- */

    if (email) {
      try {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

        if (!RESEND_API_KEY) {
          console.log("❌ Missing RESEND_API_KEY")
        } else if (!profile.email) {
          console.log("⚠️ No email found on profile")
        } else {
          console.log("📧 sending email to:", profile.email)

          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Melo Marketplace <noreply@melomarketplace.app>",
              to: profile.email,
              subject: title,
              text: body,
              reply_to: "support@melomarketplace.app",
            }),
          })

          const emailJson = await emailRes.json()

          if (!emailRes.ok) {
            console.log("❌ EMAIL FAILED:", emailJson)
          } else {
            console.log("✅ EMAIL SENT:", emailJson)
          }
        }
      } catch (emailErr) {
        console.log("⚠️ EMAIL CRASHED:", emailErr)
      }
    }

    console.log("✅ send-notification COMPLETE")

    return new Response("OK", { status: 200 })

  } catch (err) {
    console.error("💥 FUNCTION CRASH:", err)
    return new Response("Error", { status: 500 })
  }
})