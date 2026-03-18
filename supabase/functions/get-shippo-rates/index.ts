import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { fromAddress, toAddress, parcel } = await req.json()

    // 🧠 Validation
    if (!fromAddress || !toAddress || !parcel) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      )
    }

    const res = await fetch("https://api.goshippo.com/shipments/", {
      method: "POST",
      headers: {
        Authorization: `ShippoToken ${Deno.env.get("SHIPPO_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address_from: fromAddress,
        address_to: toAddress,
        parcels: [parcel],
        async: false,
      }),
    })

    const data = await res.json()

    console.log("📦 SHIPPO RESPONSE:", data)

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: "Shippo API error",
          details: data,
        }),
        { status: 500 }
      )
    }

    if (!data.rates || data.rates.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No shipping rates found",
          details: data,
        }),
        { status: 400 }
      )
    }

    /* ---------------- 🔥 ADD FEE LOGIC ---------------- */

    const enhancedRates = data.rates.map((rate: any) => {
      const labelCostCents = Math.round(parseFloat(rate.amount) * 100)

      // 🔥 YOUR RULE: $2 per $20 tier
      const platformFeeCents =
        Math.max(1, Math.ceil(labelCostCents / 2000)) * 200

      const totalCents = labelCostCents + platformFeeCents

      return {
        id: rate.object_id,

        provider: rate.provider,
        service: rate.servicelevel?.name,
        estimated_days: rate.estimated_days,

        // 💰 pricing
        label_cost_cents: labelCostCents,
        fee_cents: platformFeeCents,
        total_cents: totalCents,

        // optional useful data
        currency: rate.currency,
      }
    })

    console.log("✅ ENHANCED RATES:", enhancedRates)

    return new Response(JSON.stringify(enhancedRates), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.log("❌ SHIPPO FUNCTION ERROR:", err)

    return new Response(
      JSON.stringify({
        error: err.message || "Unknown error",
      }),
      { status: 500 }
    )
  }
})