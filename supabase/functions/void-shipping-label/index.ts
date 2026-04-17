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

    // GET ORDER
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single()

    if (error || !order) {
      return new Response("Order not found", { status: 404 })
    }

    if (!order.easypost_shipment_id) {
      return new Response("No shipment found", { status: 400 })
    }

    // 🔥 VOID LABEL
    await easypost.Shipment.refund(
      order.easypost_shipment_id
    )

    // UPDATE DB
    await supabase.from("orders").update({
      label_url: null,
      tracking_number: null,
      tracking_url: null,
      tracking_status: null,

      shipping_label_purchased: false,
      shipping_rate_id: null,

      status: "paid",

      updated_at: new Date().toISOString(),
    }).eq("id", order.id)

    return Response.json({ success: true })
  } catch (err: any) {
    console.error("VOID ERROR:", err)

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    )
  }
})