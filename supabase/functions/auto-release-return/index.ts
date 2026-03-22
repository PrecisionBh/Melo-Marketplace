/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

console.log("🚀 auto_refund_returns_v2 booted")

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const CRON_SECRET = Deno.env.get("CRON_SECRET")

Deno.serve(async (req) => {
  const headerSecret = req.headers.get("x-cron-secret")

  if (!CRON_SECRET || headerSecret !== CRON_SECRET) {
    console.warn("❌ Unauthorized auto return refund attempt")
    return new Response("Unauthorized", { status: 401 })
  }

  console.log("🔎 Checking eligible return refunds...")

  const now = new Date()
  const nowISO = now.toISOString()

  console.log("🧪 CURRENT TIME:", nowISO)

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("status", "return_started")
    .eq("is_disputed", false)
    .eq("return_received", true)
    .eq("escrow_released", false)
    .eq("escrow_status", "held")
    .not("return_refund_at", "is", null)
    .lte("return_refund_at", nowISO)

  if (error) {
    console.error("❌ Fetch failed:", error)
    return new Response("Error", { status: 500 })
  }

  console.log("🧪 QUERY RESULT COUNT:", orders?.length || 0)

  if (!orders?.length) {
    console.log("🚫 No eligible return refunds")
    return Response.json({ processed: 0 })
  }

  console.log(`📦 Found ${orders.length} return refunds`)

  let processed = 0

  for (const order of orders) {
    try {
      console.log("↩️ Processing return refund:", order.id)

      if (!order.stripe_payment_intent) {
        console.warn("⚠️ Missing payment intent:", order.id)
        continue
      }

      const refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent,
        amount: order.amount_cents,
        metadata: {
          order_id: order.id,
          reason: "auto_return_delivery_timeout",
        },
      })

      console.log("✅ Stripe refund:", refund.id)

      const { error: rpcError } = await supabase.rpc(
        "return_order_refund",
        {
          p_order_id: order.id,
          p_stripe_refund_id: refund.id,
        }
      )

      if (rpcError) {
        console.error("❌ RPC failed:", rpcError)
        continue
      }

      /* ---------------- NOTIFICATIONS ---------------- */
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            userId: order.buyer_id,
            type: "order",
            title: "Refund Issued",
            body: "Your return has been received and your refund has been processed.",
            data: {
              route: `/buyer-hub/orders/${order.id}`,
            },
            dedupeKey: `auto-return-refund-buyer-${order.id}`,
          }),
        })
      } catch (e) {
        console.log("⚠️ Buyer return refund notification failed:", e)
      }

      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            userId: order.seller_id,
            type: "order",
            title: "Return Completed",
            body: "The item was returned and the buyer has been refunded.",
            data: {
              route: `/seller-hub/orders/${order.id}`,
            },
            dedupeKey: `auto-return-refund-seller-${order.id}`,
          }),
        })
      } catch (e) {
        console.log("⚠️ Seller return refund notification failed:", e)
      }

      processed++
      console.log("🎉 Return auto-refunded:", order.id)

    } catch (err: any) {
      console.error("❌ Order error:", order.id, err)

      if (err?.code === "charge_already_refunded") {
        console.warn("⚠️ Already refunded — syncing DB:", order.id)

        const { error: rpcError } = await supabase.rpc(
          "return_order_refund",
          {
            p_order_id: order.id,
            p_stripe_refund_id: "already_refunded",
          }
        )

        if (rpcError) {
          console.error("❌ RPC failed after already refunded:", rpcError)
          continue
        }

        /* ---------------- NOTIFICATIONS (SYNC CASE) ---------------- */
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              userId: order.buyer_id,
              type: "order",
              title: "Refund Issued",
              body: "Your return has been processed and refunded.",
              data: {
                route: `/buyer-hub/orders/${order.id}`,
              },
              dedupeKey: `auto-return-refund-buyer-${order.id}`,
            }),
          })
        } catch (e) {
          console.log("⚠️ Buyer sync refund notification failed:", e)
        }

        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              userId: order.seller_id,
              type: "order",
              title: "Return Completed",
              body: "The return has been processed and refunded.",
              data: {
                route: `/seller-hub/orders/${order.id}`,
              },
              dedupeKey: `auto-return-refund-seller-${order.id}`,
            }),
          })
        } catch (e) {
          console.log("⚠️ Seller sync refund notification failed:", e)
        }

        processed++
        console.log("✅ Synced already-refunded order:", order.id)
        continue
      }
    }
  }

  console.log("🏁 FINAL PROCESSED:", processed)

  return Response.json({ processed })
})