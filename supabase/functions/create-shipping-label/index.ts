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

    // 🔒 PREVENT DOUBLE PURCHASE
    if (order.shipping_label_purchased || order.label_url) {
      return new Response(
        JSON.stringify({
          error: "Label already purchased",
        }),
        { status: 400 }
      )
    }

    // --------------------------------------------------
    // RETRIEVE EXISTING SHIPMENT
    // --------------------------------------------------
    const shipment =
      await easypost.Shipment.retrieve(
        shipment_id
      )

    // --------------------------------------------------
    // FIND SELECTED RATE
    // --------------------------------------------------
    const rate = shipment.rates.find(
      (r: any) => r.id === rate_id
    )

    if (!rate) {
      throw new Error("Invalid rate selected")
    }

    // --------------------------------------------------
    // MARKUP
    // --------------------------------------------------
    const markup = 1.5

    const baseCost = Number(rate.rate)
    const finalPrice = baseCost + markup

    console.log("💰 Base cost:", baseCost)
    console.log("💰 Charged:", finalPrice)

    // --------------------------------------------------
    // BUY LABEL
    // --------------------------------------------------
    const bought = await easypost.Shipment.buy(
      shipment.id,
      rate
    )

    if (!bought || !bought.tracking_code) {
      throw new Error("Failed to purchase label")
    }

    // --------------------------------------------------
    // UPDATE ORDER (FULLY)
    // --------------------------------------------------
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        // SHIPPING STATE
        status: "label_purchased",
        shipped_at: new Date().toISOString(),

        // TRACKING
        tracking_number: bought.tracking_code,
        tracking_url: bought.tracker?.public_url || null,
        tracking_status: "in_transit",

        // CARRIER
        carrier:
          rate.carrier === "UPSDAP"
            ? "UPS"
            : rate.carrier,

        // EASYPOST IDS
        easypost_tracker_id: bought.tracker?.id,
        easypost_shipment_id: shipment.id,

        // LABEL
        label_url: bought.postage_label?.label_url,
        shipping_label_purchased: true,
        shipping_rate_id: rate.id,

        // COST TRACKING (🔥 IMPORTANT)
        shipping_label_cost_cents: Math.round(baseCost * 100),

        // OPTIONAL PROFIT TRACKING
        shipping_markup_cents: Math.round(markup * 100),
        shipping_total_charged_cents: Math.round(finalPrice * 100),

        // TIMESTAMPS
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    if (updateError) {
      console.error("DB UPDATE ERROR:", updateError)
      throw new Error("Failed to update order")
    }

    // --------------------------------------------------
    // NOTIFY BUYER
    // --------------------------------------------------
    try {
      await supabase.functions.invoke(
        "send-notification",
        {
          body: {
            userId: order.buyer_id,
            type: "order",
            title: "Item Shipped 📦",
            body: "Your order has been shipped.",
            data: {
              route: "/orders/[id]",
              params: { id: order.id },
            },
            dedupeKey: `label-${order.id}`,
          },
        }
      )
    } catch (e) {
      console.log("Notification failed (non-blocking)")
    }

    return Response.json({
      success: true,
      label_url: bought.postage_label?.label_url,
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