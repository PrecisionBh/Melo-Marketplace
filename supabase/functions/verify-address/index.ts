import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    console.log("🔥 VERIFY FUNCTION HIT")

    // ✅ CORS (CRITICAL for Expo / mobile)
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      })
    }

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    }

    const body = await req.json()
    console.log("📦 REQUEST BODY:", body)

    const apiKey = Deno.env.get("EASYPOST_API_KEY")

    if (!apiKey) {
      console.error("❌ Missing EasyPost API key")

      return new Response(
        JSON.stringify({ fallback: true, error: "Missing API key" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      )
    }

    // 🔥 HARD TIMEOUT (5 seconds max)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    let epRes

    try {
      epRes = await fetch("https://api.easypost.com/v2/addresses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verify: ["delivery"],
          address: {
            street1: body.address_line1,
            street2: body.address_line2 || "",
            city: body.city,
            state: body.state,
            zip: body.postal_code,
            country: "US",
          },
        }),
        signal: controller.signal,
      })
    } catch (err) {
      console.error("❌ EasyPost TIMEOUT or FAIL:", err)

      return new Response(
        JSON.stringify({
          fallback: true,
          error: "Verification timeout",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      )
    } finally {
      clearTimeout(timeout)
    }

    const epText = await epRes.text()
    console.log("📡 EASYPOST RAW:", epText)

    let epData = null

    try {
      epData = JSON.parse(epText)
    } catch {
      console.error("❌ EasyPost returned invalid JSON")

      return new Response(
        JSON.stringify({
          fallback: true,
          error: "Invalid EasyPost response",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      )
    }

    // ✅ SUCCESS RESPONSE
    return new Response(JSON.stringify(epData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (err) {
    console.error("❌ FUNCTION ERROR:", err)

    return new Response(
      JSON.stringify({
        fallback: true,
        error: "Internal server error",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  }
})