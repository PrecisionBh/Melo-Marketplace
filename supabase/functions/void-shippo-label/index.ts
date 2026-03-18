import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const SHIPPO_API_KEY = Deno.env.get("SHIPPO_API_KEY")!
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

serve(async (req) => {
  console.log("🚀 VOID FUNCTION HIT")

  try {
    /* ---------------- PARSE BODY ---------------- */

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      console.log("⚠️ Failed to parse JSON body")
    }

    console.log("📥 Request body:", body)

    const orderId = body?.orderId

    if (!orderId) {
      console.log("❌ Missing orderId")
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400,
      })
    }

    /* ---------------- FETCH ORDER ---------------- */

    console.log("🔍 Fetching order:", orderId)

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select(`
        shippo_transaction_id,
        shipping_label_purchased,
        shipping_payment_intent_id,
        shipping_label_cost_cents
      `)
      .eq("id", orderId)
      .single()

    console.log("📦 Order:", order)
    console.log("⚠️ Fetch error:", fetchError)

    if (fetchError || !order) {
      console.log("❌ Order not found")
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
      })
    }

    if (!order.shipping_label_purchased) {
      console.log("⚠️ No label to void (already reset?)")
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
      })
    }

    const transactionId = order.shippo_transaction_id

    if (!transactionId) {
      console.log("❌ Missing Shippo transaction ID")
      return new Response(
        JSON.stringify({ error: "Missing Shippo transaction ID" }),
        { status: 400 }
      )
    }

    console.log("📦 Transaction ID:", transactionId)

    /* ---------------- SHIPPO VOID ---------------- */

    console.log("🚫 Sending void request to Shippo...")

    let shippoData: any = null

    const res = await fetch(
      `https://api.goshippo.com/transactions/${transactionId}/void`,
      {
        method: "POST",
        headers: {
          Authorization: `ShippoToken ${SHIPPO_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    )

    const rawText = await res.text()
    console.log("📬 Shippo RAW response:", rawText)

    try {
      shippoData = JSON.parse(rawText)
    } catch {
      shippoData = { raw: rawText }
    }

    console.log("📬 Shippo parsed:", shippoData)
    console.log("📬 Shippo status:", res.status)

    if (!res.ok) {
      console.log("❌ Shippo HTTP error FULL:", rawText)

      return new Response(
        JSON.stringify({
          error: "Shippo void failed",
          details: rawText,
        }),
        { status: 500 }
      )
    }

    if (
      shippoData?.status !== "SUCCESS" &&
      shippoData?.status !== "QUEUED"
    ) {
      console.log("❌ Shippo did not confirm void:", shippoData)

      return new Response(
        JSON.stringify({
          error: "Void not confirmed",
          details: shippoData,
        }),
        { status: 500 }
      )
    }

    console.log("✅ Shippo void success")

    /* ---------------- STRIPE REFUND ---------------- */

    if (
      order.shipping_payment_intent_id &&
      order.shipping_label_cost_cents
    ) {
      console.log("💰 Attempting Stripe refund...")

      try {
        const refundRes = await fetch("https://api.stripe.com/v1/refunds", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            payment_intent: order.shipping_payment_intent_id,
            amount: String(order.shipping_label_cost_cents),
          }),
        })

        const refundText = await refundRes.text()
        console.log("📬 Stripe raw:", refundText)

        if (!refundRes.ok) {
          console.log("⚠️ Stripe refund failed but continuing")
        } else {
          console.log("✅ Stripe refund success")
        }
      } catch (err) {
        console.log("⚠️ Stripe error (non-blocking):", err)
      }
    } else {
      console.log("⚠️ No Stripe refund needed")
    }

    /* ---------------- DB RESET ---------------- */

    console.log("🧹 Resetting order in DB...")

    const now = new Date().toISOString()

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        shipping_label_purchased: false,
        shipping_label_cost_cents: null,
        shipping_payment_intent_id: null,
        shipping_rate_id: null,

        shippo_transaction_id: null,
        shippo_shipment_id: null,

        label_url: null,
        tracking_number: null,
        tracking_url: null,
        carrier: null,

        tracking_status: null,
        tracking_last_updated: null,
        shipped_at: null,
        estimated_delivery_date: null,

        status: "paid",
        updated_at: now,
      })
      .eq("id", orderId)

    console.log("📬 DB update error:", updateError)

    if (updateError) {
      console.log("❌ DB update failed")
      return new Response(JSON.stringify({ error: "DB update failed" }), {
        status: 500,
      })
    }

    console.log("✅ VOID FLOW COMPLETE")

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    })
  } catch (err) {
    console.log("❌ FULL FUNCTION CRASH:", err)

    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    })
  }
})