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

    console.log("📦 SHIPPING QUOTE BODY:", JSON.stringify(body, null, 2))

    // 🔥 VALIDATE INPUT
    if (!body?.to || !body?.from) {
      console.log("❌ Missing address data")
      return new Response(
        JSON.stringify({ error: "Missing address data" }),
        { status: 400 }
      )
    }

    // 🔥 NORMALIZE ADDRESSES (CRITICAL)
    const toAddress = {
      name: body.to.name || "Customer",
      street1: body.to.street1,
      street2: body.to.street2 || undefined,
      city: body.to.city,
      state: body.to.state,
      zip: String(body.to.zip).slice(0, 5),
      country: "US",
    }

    const fromAddress = {
      name: body.from.name || "Seller",
      street1: body.from.street1,
      street2: body.from.street2 || undefined,
      city: body.from.city,
      state: body.from.state,
      zip: String(body.from.zip).slice(0, 5),
      country: "US",
    }

    console.log("📬 TO ADDRESS:", JSON.stringify(toAddress, null, 2))
    console.log("📤 FROM ADDRESS:", JSON.stringify(fromAddress, null, 2))

    const shipment = await easypost.Shipment.create({
      to_address: toAddress,
      from_address: fromAddress,
      parcel: {
        weight: body.weight || 16,
      },
    })

    console.log("🚚 Shipment created:", shipment.id)

    // 🔥 LOG FULL RESPONSE IF NO RATES
    if (!shipment.rates || shipment.rates.length === 0) {
      console.log("❌ FULL SHIPMENT RESPONSE:", JSON.stringify(shipment, null, 2))
      throw new Error("No rates returned from EasyPost")
    }

    console.log(
      "📊 RAW RATES:",
      shipment.rates.map((r: any) => ({
        carrier: r.carrier,
        service: r.service,
        rate: r.rate,
      }))
    )

    // 🔥 TEMP: DO NOT FILTER (we want to see ALL carriers first)
    const validRates = shipment.rates

    // 🔥 PICK CHEAPEST
    const cheapest = validRates.reduce((min: any, r: any) => {
      return Number(r.rate) < Number(min.rate) ? r : min
    }, validRates[0])

    console.log("✅ CHEAPEST RATE:", cheapest)

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