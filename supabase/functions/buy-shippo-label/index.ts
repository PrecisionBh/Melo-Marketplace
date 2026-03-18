import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const SHIPPO_API_KEY = Deno.env.get("SHIPPO_API_KEY")!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

/* 🔗 Fallback tracking builder */
function buildFallbackTrackingUrl(carrier: string, tracking: string) {
  switch (carrier) {
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking}`
    case "UPS":
      return `https://www.ups.com/track?tracknum=${tracking}`
    case "FedEx":
      return `https://www.fedex.com/fedextrack/?tracknumbers=${tracking}`
    case "DHL":
      return `https://www.dhl.com/en/express/tracking.html?AWB=${tracking}`
    default:
      return null
  }
}

serve(async (req) => {
  try {
    const { orderId, rateId } = await req.json()

    if (!orderId || !rateId) {
      return new Response(JSON.stringify({ error: "Missing data" }), {
        status: 400,
      })
    }

    // 🔒 Prevent duplicate purchase
    const { data: existing } = await supabase
      .from("orders")
      .select("shipping_label_purchased")
      .eq("id", orderId)
      .single()

    if (existing?.shipping_label_purchased) {
      console.log("⚠️ Label already purchased:", orderId)
      return new Response(JSON.stringify({ message: "Already purchased" }), {
        status: 200,
      })
    }

    console.log("📦 Purchasing REAL label:", orderId)

    /* ---------------- SHIPPO PURCHASE ---------------- */

    const shippoRes = await fetch("https://api.goshippo.com/transactions/", {
      method: "POST",
      headers: {
        Authorization: `ShippoToken ${SHIPPO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rate: rateId,
        label_file_type: "PDF",
        async: false,
      }),
    })

    if (!shippoRes.ok) {
      const text = await shippoRes.text()
      console.error("❌ Shippo HTTP error:", text)
      return new Response(JSON.stringify({ error: "Shippo request failed" }), {
        status: 500,
      })
    }

    const data = await shippoRes.json()

    if (!data || data.status !== "SUCCESS") {
      console.error("❌ Shippo failed:", data)
      return new Response(JSON.stringify({ error: "Label purchase failed" }), {
        status: 500,
      })
    }

    /* ---------------- EXTRACT DATA ---------------- */

    const labelUrl = data.label_url
    const trackingNumber = data.tracking_number
    const trackingUrlProvider = data.tracking_url_provider

    // 🔥 FIXED carrier parsing
    const rawCarrier = data.rate?.provider || ""
    const normalized = rawCarrier.toLowerCase()

    let carrier = null

    if (normalized.includes("ups")) carrier = "UPS"
    else if (normalized.includes("usps")) carrier = "USPS"
    else if (normalized.includes("fedex")) carrier = "FedEx"
    else if (normalized.includes("dhl")) carrier = "DHL"

    // 🔗 Tracking URL
    const trackingUrl =
      trackingUrlProvider ||
      (trackingNumber && carrier
        ? buildFallbackTrackingUrl(carrier, trackingNumber)
        : null)

    const transactionId = data.object_id
    const shipmentId = data.shipment
    const estimatedDays = data.rate?.estimated_days || null

    const amount = data.rate?.amount
    const labelCostCents = amount
      ? Math.round(parseFloat(amount) * 100)
      : 0

    console.log("✅ LIVE LABEL CREATED:", {
      orderId,
      carrier,
      trackingNumber,
      labelCostCents,
    })

    const now = new Date().toISOString()

    /* ---------------- DB UPDATE ---------------- */

    const { error } = await supabase
      .from("orders")
      .update({
        shipping_label_purchased: true,
        shipping_rate_id: rateId,

        shippo_transaction_id: transactionId,
        shippo_shipment_id: shipmentId,

        label_url: labelUrl,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        carrier: carrier,

        tracking_status: "label_created",
        tracking_last_updated: now,

        status: "shipped",
        shipped_at: now,

        estimated_delivery_date: estimatedDays
          ? new Date(Date.now() + estimatedDays * 86400000).toISOString()
          : null,

        shipping_label_cost_cents: labelCostCents,

        updated_at: now,
      })
      .eq("id", orderId)
      .eq("shipping_label_purchased", false)

    if (error) {
      console.error("❌ DB update failed:", error)
      return new Response(JSON.stringify({ error: "DB update failed" }), {
        status: 500,
      })
    }

    /* ---------------- RESPONSE ---------------- */

    return new Response(
      JSON.stringify({
        success: true,
        label_url: labelUrl,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        carrier: carrier,
      }),
      { status: 200 }
    )
  } catch (err) {
    console.error("❌ buy-shippo-label error:", err)

    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    })
  }
})