/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import EasyPost from "npm:@easypost/api"
import { createClient } from "npm:@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const easypost = new EasyPost(
  Deno.env.get("EASYPOST_API_KEY")
)

serve(async (req) => {
  try {
    console.log("🚀 get-shipping-rates called")

    const body = await req.json()
    console.log("📦 Incoming body:", body)

    const { order_id } = body

    if (!order_id) {
      console.log("❌ Missing order_id")
      return new Response("Missing order_id", { status: 400 })
    }

    // --------------------------------------------------
    // GET ORDER
    // --------------------------------------------------
    console.log("🔎 Fetching order:", order_id)

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single()

    if (error) {
      console.log("❌ Order fetch error:", error)
      throw error
    }

    if (!order) {
      console.log("❌ Order not found")
      return new Response("Order not found", { status: 404 })
    }

    console.log("✅ Order loaded:", {
      id: order.id,
      buyer: order.buyer_id,
      seller: order.seller_id,
    })

    // --------------------------------------------------
    // BUYER ADDRESS (TO)
    // --------------------------------------------------
    const toAddress = {
      name: order.shipping_name || "Buyer",
      street1: order.shipping_line1,
      street2: order.shipping_line2 || undefined,
      city: order.shipping_city,
      state: order.shipping_state,
      zip: order.shipping_postal_code,
      country: "US",
    }

    console.log("📬 TO address:", toAddress)

    // --------------------------------------------------
    // SELLER ADDRESS (FROM)
    // --------------------------------------------------
    console.log("🔎 Fetching seller profile:", order.seller_id)

    const { data: sellerProfile, error: sellerError } =
      await supabase
        .from("profiles")
        .select("*")
        .eq("id", order.seller_id)
        .single()

    if (sellerError) {
      console.log("❌ Seller fetch error:", sellerError)
      throw sellerError
    }

    const fromAddress = {
      name: sellerProfile?.full_name || "Seller",
      street1:
        sellerProfile?.address_line1 || "123 Main St",
      street2: sellerProfile?.address_line2 || undefined,
      city: sellerProfile?.city || "Orlando",
      state: sellerProfile?.state || "FL",
      zip: sellerProfile?.zip || "32801",
      country: "US",
    }

    console.log("📤 FROM address:", fromAddress)

    // --------------------------------------------------
    // PARCEL
    // --------------------------------------------------
    const parcel = {
      weight: 16,
    }

    console.log("📦 Parcel:", parcel)

    // --------------------------------------------------
    // CREATE SHIPMENT
    // --------------------------------------------------
    console.log("🚚 Creating EasyPost shipment...")

    const shipment = await easypost.Shipment.create({
      to_address: toAddress,
      from_address: fromAddress,
      parcel,
    })

    console.log("✅ Shipment created:", shipment.id)

    if (!shipment.rates || shipment.rates.length === 0) {
      console.log("❌ No rates returned from EasyPost")
      throw new Error("No rates returned from EasyPost")
    }

    console.log(
      "📊 Total rates from EasyPost:",
      shipment.rates.length
    )

    // --------------------------------------------------
    // FILTER CARRIERS
    // --------------------------------------------------
    console.log(
  "📦 ALL CARRIERS:",
  shipment.rates.map((r: any) => r.carrier)
)

// Normalize carrier names (important)
const validRates = shipment.rates.filter((r: any) => {
  const carrier = r.carrier?.toUpperCase()

  return (
    carrier === "USPS" ||
    carrier === "UPS" ||
    carrier === "UPSDAP"
  )
})

console.log(
  "✅ FILTERED USPS + UPS:",
  validRates.map((r: any) => ({
    carrier: r.carrier,
    service: r.service,
    rate: r.rate,
  }))
)

    console.log("📊 Valid rates:", validRates.length)

    if (!validRates.length) {
      console.log("❌ No valid carriers found")
      throw new Error("No valid shipping rates found")
    }

    // --------------------------------------------------
    // MARKUP
    // --------------------------------------------------
    const markup = 1.5

    // --------------------------------------------------
    // FORMAT RATES
    // --------------------------------------------------
    const formattedRates = validRates.map((r: any) => {
      const base = Number(r.rate)
      const final = base + markup

      return {
        rate_id: r.id,
        carrier: r.carrier,
        service: r.service,
        delivery_days: r.delivery_days,
        base_rate: base,
        markup: markup,
        final_rate: final,
        display_price: `$${final.toFixed(2)}`,
      }
    })

    formattedRates.sort(
  (a: any, b: any) =>
    Number(a.final_rate) - Number(b.final_rate)
)

    console.log("✅ Final formatted rates:", formattedRates)

    return Response.json({
      success: true,
      shipment_id: shipment.id,
      rates: formattedRates,
    })
  } catch (err: any) {
    console.error("💥 RATE ERROR:", err)

    return new Response(
      JSON.stringify({
        error: err.message,
      }),
      { status: 500 }
    )
  }
})