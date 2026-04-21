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
    const { order_id } = await req.json()

    if (!order_id) {
      return new Response("Missing order_id", { status: 400 })
    }

    /* ---------------- GET ORDER ---------------- */

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single()

    if (error || !order) {
      return new Response("Order not found", { status: 404 })
    }

    /* ---------------- VALIDATION ---------------- */

    if (!order.easypost_shipment_id) {
      return new Response("No shipment found", { status: 400 })
    }

    if (!order.label_url) {
      return new Response("No label to void", { status: 400 })
    }

    // 🔥 CRITICAL: only allow void before carrier scan
    if (
      order.tracking_status &&
      !["label_created", "pre_transit", "awaiting_label"].includes(order.tracking_status)
    ) {
      return new Response(
        "Label already used or in transit — cannot void",
        { status: 400 }
      )
    }

    console.log("🚀 Voiding label for order:", order.id)

    /* ---------------- EASYPOST REFUND ---------------- */

    let refundResult

    try {
      refundResult = await easypost.Shipment.refund(
        order.easypost_shipment_id
      )
    } catch (err: any) {
      console.error("EasyPost refund error:", err)

      return new Response(
        JSON.stringify({
          error:
            err?.message ||
            "Failed to void label with carrier",
        }),
        { status: 500 }
      )
    }

    if (!refundResult) {
      throw new Error("Refund returned empty response")
    }

    console.log("✅ Label voided with EasyPost")

    /* ---------------- UPDATE DATABASE ---------------- */

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        // 🔥 RESET ORDER STATE
        status: "paid",
        shipped_at: null,

        // 🔥 RESET TRACKING
        tracking_number: null,
        tracking_url: null,
        tracking_status: "awaiting_label",

        // 🔥 RESET CARRIER
        carrier: null,

        // 🔥 RESET LABEL DATA
        label_url: null,
        shipping_label_purchased: false,
        shipping_rate_id: null,

        // 🔥 RESET EASYPOST STATE (prevent reuse bugs)
        easypost_shipment_id: null,
        easypost_tracker_id: null,

        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    if (updateError) {
      console.error("DB update failed:", updateError)

      return new Response(
        "Label voided but DB update failed",
        { status: 500 }
      )
    }

    /* ---------------- SUCCESS ---------------- */

    return new Response(
      JSON.stringify({
        success: true,
        message: "Label successfully voided",
      }),
      { status: 200 }
    )
  } catch (err: any) {
    console.error("VOID ERROR:", err)

    return new Response(
      JSON.stringify({
        error: err.message || "Unknown error",
      }),
      { status: 500 }
    )
  }
})