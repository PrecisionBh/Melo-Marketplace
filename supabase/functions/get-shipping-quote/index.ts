import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import EasyPost from "npm:@easypost/api"

const easypost = new EasyPost(
  Deno.env.get("EASYPOST_API_KEY")
)

serve(async (req) => {
  try {
    // ✅ CORS
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      })
    }

    const body = await req.json()
    console.log("📦 SHIPPING QUOTE BODY:", body)

    // 🔥 VALIDATE INPUT
    if (!body?.to || !body?.from) {
      console.log("❌ Missing address data")
      return new Response(
        JSON.stringify({ error: "Missing address data" }),
        { status: 400 }
      )
    }

    const shipment = await easypost.Shipment.create({
      to_address: body.to,
      from_address: body.from,
      parcel: {
        weight: body.weight || 16,
      },
    })

    console.log("🚚 Shipment created:", shipment.id)

    if (!shipment.rates || shipment.rates.length === 0) {
      console.log("❌ No rates returned from EasyPost")
      throw new Error("No rates returned from EasyPost")
    }

    console.log(
      "📊 ALL RATES:",
      shipment.rates.map((r: any) => ({
        carrier: r.carrier,
        service: r.service,
        rate: r.rate,
      }))
    )

    // 🔥 MATCH YOUR LABEL FUNCTION (FILTER)
    const validRates = shipment.rates.filter((r: any) => {
      const carrier = r.carrier?.toUpperCase()

      return (
        carrier === "USPS" ||
        carrier === "UPS" ||
        carrier === "UPSDAP"
      )
    })

    if (!validRates.length) {
      console.log("❌ No valid carriers found")
      throw new Error("No valid shipping rates found")
    }

    // 🔥 CHEAPEST FROM VALID
    const cheapest = validRates.reduce((min: any, r: any) => {
      return Number(r.rate) < Number(min.rate) ? r : min
    }, validRates[0])

    console.log("✅ CHEAPEST:", cheapest)

    return Response.json({
      rate: cheapest.rate,
      carrier: cheapest.carrier,
      service: cheapest.service,
    })
  } catch (err: any) {
    console.error("💥 SHIPPING QUOTE ERROR:", err)

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    )
  }
})