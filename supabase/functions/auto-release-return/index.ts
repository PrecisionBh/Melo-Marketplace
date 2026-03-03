/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

console.log("🚀 auto_refund_returns booted")

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const CRON_SECRET = Deno.env.get("CRON_SECRET")

Deno.serve(async (req) => {
  try {
    // 🔐 SECRET CHECK
    const headerSecret = req.headers.get("x-cron-secret")

    if (!CRON_SECRET || headerSecret !== CRON_SECRET) {
      console.warn("❌ Unauthorized auto return refund attempt")
      return new Response("Unauthorized", { status: 401 })
    }

    console.log("🔎 Checking for eligible auto return refunds...")

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString()

    console.log("🕒 Seven days ago cutoff:", sevenDaysAgo)

    // 🔍 Lightweight existence check
    const { data: eligible, error: eligibleErr } = await supabase
      .from("orders")
      .select("id")
      .eq("status", "return_started")
      .eq("is_disputed", false)
      .eq("return_received", false)
      .eq("escrow_released", false)
      .eq("escrow_status", "held")
      .not("return_tracking_number", "is", null)
      .lte("return_shipped_at", sevenDaysAgo)
      .limit(1)

    if (eligibleErr) {
      console.error("❌ Eligible return check failed:", eligibleErr)
      return new Response(
        JSON.stringify({ step: "eligible_check", error: eligibleErr }),
        { status: 500 }
      )
    }

    if (!eligible?.length) {
      console.log("✅ No eligible returns")
      return Response.json({ processed: 0 })
    }

    console.log("🔥 Eligible return exists, fetching full rows...")

    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "return_started")
      .eq("is_disputed", false)
      .eq("return_received", false)
      .eq("escrow_released", false)
      .eq("escrow_status", "held")
      .not("return_tracking_number", "is", null)
      .lte("return_shipped_at", sevenDaysAgo)

    if (error) {
      console.error("❌ Fetch eligible orders failed:", error)
      return new Response(
        JSON.stringify({ step: "fetch_orders", error }),
        { status: 500 }
      )
    }

    console.log("📦 Orders to process:", orders?.length)

    for (const order of orders ?? []) {
      try {
        console.log("↩️ Processing order:", order.id)

        if (!order.stripe_payment_intent) {
          console.warn("⚠️ Missing stripe_payment_intent for order:", order.id)
          continue
        }

        console.log("💳 Refunding payment_intent:", order.stripe_payment_intent)
        console.log("💰 Refund amount (cents):", order.amount_cents)

        const refund = await stripe.refunds.create({
          payment_intent: order.stripe_payment_intent,
          amount: order.amount_cents,
          metadata: {
            order_id: order.id,
            reason: "auto_return_timeout",
          },
        })

        console.log("✅ Stripe refund created:", refund.id)

        // 🧾 Update DB via RPC
        const { error: rpcError } = await supabase.rpc(
          "return_order_refund",
          {
            p_order_id: order.id,
            p_stripe_refund_id: refund.id,
          }
        )

        if (rpcError) {
          console.error("❌ RPC failed:", rpcError)
          return new Response(
            JSON.stringify({ step: "rpc_update", error: rpcError }),
            { status: 500 }
          )
        }

        console.log("✅ Return auto-refunded successfully:", order.id)

      } catch (innerErr) {
        console.error("❌ Error processing order:", order.id, innerErr)
        return new Response(
          JSON.stringify({ step: "refund_loop", error: innerErr?.message ?? innerErr }),
          { status: 500 }
        )
      }
    }

    return Response.json({ processed: orders?.length ?? 0 })

  } catch (outerErr) {
    console.error("❌ Fatal auto refund error:", outerErr)
    return new Response(
      JSON.stringify({ step: "fatal", error: outerErr?.message ?? outerErr }),
      { status: 500 }
    )
  }
})