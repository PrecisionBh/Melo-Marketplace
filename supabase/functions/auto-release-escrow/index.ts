/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

console.log("🚀 auto_release_escrow booted")

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
    console.warn("❌ Unauthorized auto release attempt")
    return new Response("Unauthorized", { status: 401 })
  }

  console.log("🔎 Checking for eligible escrows...")

  const now = new Date().toISOString()
  console.log("🧪 CURRENT TIME (ISO):", now)

  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("*")
    .eq("tracking_status", "delivered")
    .eq("escrow_released", false)
    .eq("is_disputed", false)
    .is("return_requested_at", null)
    .not("escrow_release_at", "is", null)
    .lte("escrow_release_at", now)

  if (ordersErr) {
    console.error("❌ Orders fetch failed", ordersErr)
    return new Response("Error", { status: 500 })
  }

  if (!orders?.length) {
    console.log("🚫 No eligible escrows found")
    return Response.json({ processed: 0 })
  }

  console.log(`💰 Found ${orders.length} eligible orders`)

  const balance = await stripe.balance.retrieve()
  const availableUSD =
    balance.available.find(b => b.currency === "usd")?.amount ?? 0

  console.log("💵 Stripe available balance:", availableUSD)

  let processed = 0

  for (const order of orders) {
    try {
      console.log("💰 Processing order:", order.id)

      if (!order.escrow_funded_at) {
        console.warn("⚠️ Skipping — escrow not funded:", order.id)
        continue
      }

      console.log("💵 Order requires:", order.seller_net_cents)

      if (availableUSD < order.seller_net_cents) {
        console.warn("⚠️ Stripe funds not available yet")
        continue
      }

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", order.seller_id)
        .single()

      if (profileErr || !profile?.stripe_account_id) {
        console.warn("⚠️ Missing Stripe account:", order.seller_id)
        continue
      }

      console.log("🏦 Sending to Stripe account:", profile.stripe_account_id)

      const transfer = await stripe.transfers.create({
        amount: order.seller_net_cents,
        currency: "usd",
        destination: profile.stripe_account_id,
        metadata: {
          order_id: order.id,
        },
      })

      console.log("✅ Stripe transfer created:", transfer.id)

      const { error: rpcError } = await supabase.rpc("release_order_escrow", {
        p_order_id: order.id,
        p_stripe_transfer_id: transfer.id,
      })

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
            userId: order.seller_id,
            type: "order",
            title: "Escrow Released",
            body: "Funds from your completed order have been released to your account.",
            data: {
              route: `/seller-hub/orders/${order.id}`,
            },
            dedupeKey: `auto-release-seller-${order.id}`,
          }),
        })
      } catch (e) {
        console.log("⚠️ Seller auto-release notification failed:", e)
      }

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
            title: "Order Completed",
            body: "Your order has been successfully completed and payment has been released.",
            data: {
              route: `/buyer-hub/orders/${order.id}`,
            },
            dedupeKey: `auto-release-buyer-${order.id}`,
          }),
        })
      } catch (e) {
        console.log("⚠️ Buyer auto-release notification failed:", e)
      }

      processed++
      console.log("🎉 Escrow fully released:", order.id)

    } catch (err) {
      console.error("❌ Failed processing order:", order.id, err)
    }
  }

  console.log("🏁 FINAL PROCESSED COUNT:", processed)

  return Response.json({ processed })
})