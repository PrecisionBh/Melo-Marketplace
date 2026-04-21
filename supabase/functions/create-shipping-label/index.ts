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
    const { order_id, rate_id, shipment_id } =
      await req.json()

    if (!order_id || !rate_id || !shipment_id) {
      return new Response(
        "Missing order_id, rate_id, or shipment_id",
        { status: 400 }
      )
    }

    /* -------------------------------------------------- */
    /* ---------------- GET ORDER ------------------------ */
    /* -------------------------------------------------- */

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single()

    if (error || !order) {
      return new Response("Order not found", {
        status: 404,
      })
    }

    // 🔒 PREVENT DOUBLE PURCHASE
    if (order.shipping_label_purchased || order.label_url) {
      return new Response(
        JSON.stringify({
          error: "Label already purchased",
        }),
        { status: 400 }
      )
    }

    /* -------------------------------------------------- */
    /* ------------ RETRIEVE SHIPMENT -------------------- */
    /* -------------------------------------------------- */

    const shipment =
      await easypost.Shipment.retrieve(
        shipment_id
      )

    console.log("📦 Shipment retrieved:", shipment.id)

    /* -------------------------------------------------- */
    /* ---------------- FIND RATE ------------------------ */
    /* -------------------------------------------------- */

    const rate = shipment.rates.find(
      (r: any) => r.id === rate_id
    )

    if (!rate) {
      throw new Error("Invalid rate selected")
    }

    console.log("📦 Selected rate:", rate)

    /* -------------------------------------------------- */
    /* ---------------- MARKUP --------------------------- */
    /* -------------------------------------------------- */

    const markup = 1.5

    const baseCost = Number(rate.rate)
    const finalPrice = baseCost + markup

    console.log("💰 Base cost:", baseCost)
    console.log("💰 Charged:", finalPrice)

    /* -------------------------------------------------- */
    /* ---------------- BUY LABEL ------------------------ */
    /* -------------------------------------------------- */

    console.log("🚀 Attempting label purchase:", {
      shipment_id: shipment.id,
      rate_id: rate.id,
    })

    let bought

    try {
      bought = await easypost.Shipment.buy(
        shipment.id,
        rate.id
      )

      console.log("✅ PURCHASE RESPONSE:", bought)
    } catch (err) {
      console.error("❌ EASYPOST BUY FAILED:", err)
      throw err
    }

    if (!bought) {
      throw new Error("No shipment returned from EasyPost")
    }

    const trackingNumber =
      bought.tracker?.tracking_code ||
      bought.tracking_code ||
      null

    const trackingUrl =
      bought.tracker?.public_url || null

    const labelUrl =
      bought.postage_label?.label_url || null

    console.log("📦 LABEL URL:", labelUrl)
    console.log("📦 TRACKING:", trackingNumber)
    console.log("📦 TRACKING URL:", trackingUrl)

    if (!labelUrl) {
      throw new Error("Label was not generated")
    }

    /* -------------------------------------------------- */
    /* ---------------- UPDATE ORDER --------------------- */
    /* -------------------------------------------------- */

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        // ✅ KEEP ORDER ACTIVE (DO NOT MARK SHIPPED)
        status: "paid",

        // ✅ LABEL CREATED (NOT SHIPPED)
        tracking_status: "label_created",

        // TRACKING
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,

        // CARRIER
        carrier:
          rate.carrier === "UPSDAP"
            ? "UPS"
            : rate.carrier,

        // EASYPOST IDS
        easypost_tracker_id:
          bought.tracker?.id || null,
        easypost_shipment_id: shipment.id,

        // LABEL
        label_url: labelUrl,
        shipping_label_purchased: true,
        shipping_rate_id: rate.id,

        // COST TRACKING
        shipping_label_cost_cents: Math.round(
          baseCost * 100
        ),

        // TIMESTAMP
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    if (updateError) {
      console.error("❌ DB UPDATE ERROR:", updateError)
      throw new Error("Failed to update order")
    }

    console.log("📦 LABEL CREATED SUCCESS:", {
      order_id,
      labelUrl,
      tracking: trackingNumber,
    })

    /* -------------------------------------------------- */
    /* ---------------- NOTIFY BUYER --------------------- */
    /* -------------------------------------------------- */

    try {
      await supabase.functions.invoke(
        "send-notification",
        {
          body: {
            userId: order.buyer_id,
            type: "order",
            title: "Shipping Label Created 📦",
            body:
              "Your seller has prepared your shipment.",
            data: {
              route: "/orders/[id]",
              params: { id: order.id },
            },
            dedupeKey: `label-${order.id}`,
            email: true,
          },
        }
      )
    } catch {
      console.log(
        "Notification failed (non-blocking)"
      )
    }

    return Response.json({
      success: true,
      label_url: labelUrl,
    })
  } catch (err: any) {
    console.error("💥 LABEL ERROR:", err)

    return new Response(
      JSON.stringify({
        error: err.message,
      }),
      { status: 500 }
    )
  }
})