import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const body = await req.json()

    console.log("📧 Email request received:", body)

    const { to, subject, html } = body

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing fields" }),
        { status: 400 }
      )
    }

    // 🚨 TEMP: Just log (proves pipeline works)
    console.log("📧 Sending email to:", to)
    console.log("📧 Subject:", subject)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    )
  } catch (err) {
    console.log("❌ Email function error:", err)

    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500 }
    )
  }
})