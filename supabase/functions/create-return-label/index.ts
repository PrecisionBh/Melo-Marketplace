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

    // --------------------------------------------------
    // GET ORDER
    // --------------------------------------------------
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

    // 🔒 PREVENT DOUBLE RETURN LABEL
    if (order.return_label_purchased || order.return_label_url) {
      return new Response(
        JSON.stringify({
          error: "Return label already purchased",
        }),
        { status: 400 }
      )
    }

    // --------------------------------------------------
    // RETRIEVE SHIPMENT
    // --------------------------------------------------
    const shipment =
      await easypost.Shipment.retrieve(
        shipment_id
      )

    const rate = shipment.rates.find(
      (r: any) => r.id === rate_id
    )

    if (!rate) {
      throw new Error("Invalid rate selected")
    }

    // --------------------------------------------------
    // COST
    // --------------------------------------------------
    const baseCost = Number(rate.rate)

    console.log("🔁 RETURN LABEL COST:", baseCost)

    // --------------------------------------------------
    // BUY LABEL (BUYER → SELLER)
    // --------------------------------------------------
    const bought = await easypost.Shipment.buy(
      shipment.id,
      rate
    )

    if (!bought || !bought.tracking_code) {
      throw new Error("Failed to purchase return label")
    }

    const labelUrl =
      bought.postage_label?.label_url || null

    if (!labelUrl) {
      throw new Error("Return label not generated")
    }

    // --------------------------------------------------
    // UPDATE ORDER
    // --------------------------------------------------
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "return_label_purchased",

        return_tracking_number: bought.tracking_code,
        return_tracking_url:
          bought.tracker?.public_url || null,
        return_tracking_status: "in_transit",

        return_carrier:
          rate.carrier === "UPSDAP"
            ? "UPS"
            : rate.carrier,

        return_easypost_tracker_id:
          bought.tracker?.id,

        return_label_url: labelUrl,
        return_label_purchased: true,

        return_label_cost_cents: Math.round(
          baseCost * 100
        ),

        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    if (updateError) {
      throw new Error("Failed to update return label")
    }

    // --------------------------------------------------
    // 🔔 NOTIFY BUYER (🔥 UPDATED MESSAGE)
    // --------------------------------------------------
    try {
      await supabase.functions.invoke(
        "send-notification",
        {
          body: {
            userId: order.buyer_id,
            type: "order",
            title: "Return Label Ready 📦",
            body: "Your return has been approved. Please ship within 72 hours to avoid escrow release.",
            data: {
              route: "/orders/[id]",
              params: { id: order.id },
            },
            dedupeKey: `return-label-buyer-${order.id}`,
          },
        }
      )
    } catch (e) {
      console.log("Buyer notification failed")
    }

    // --------------------------------------------------
    // 🔔 NOTIFY SELLER (🔥 CLEANED MESSAGE)
    // --------------------------------------------------
    try {
      await supabase.functions.invoke(
        "send-notification",
        {
          body: {
            userId: order.seller_id,
            type: "order",
            title: "Return In Progress 🔁",
            body: "A return label has been created. Waiting for buyer to ship the item.",
            data: {
              route: "/orders/[id]",
              params: { id: order.id },
            },
            dedupeKey: `return-label-seller-${order.id}`,
          },
        }
      )
    } catch (e) {
      console.log("Seller notification failed")
    }

    return Response.json({
      success: true,
      label_url: labelUrl,
    })
  } catch (err: any) {
    console.error("💥 RETURN LABEL ERROR:", err)

    return new Response(
      JSON.stringify({
        error: err.message,
      }),
      { status: 500 }
    )
  }
})