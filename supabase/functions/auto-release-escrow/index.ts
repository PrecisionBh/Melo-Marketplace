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

const CRON_SECRET = Deno.env.get("CRON_SECRET")

Deno.serve(async (req) => {
  // 🔐 AUTH
  const headerSecret = req.headers.get("x-cron-secret")

  if (!CRON_SECRET || headerSecret !== CRON_SECRET) {
    console.warn("❌ Unauthorized auto release attempt")
    return new Response("Unauthorized", { status: 401 })
  }

  console.log("🔎 Checking for eligible escrows...")

  const now = new Date().toISOString()
  console.log("🧪 CURRENT TIME (ISO):", now)

  // 🔍 DEBUG: show ALL possible candidates (no filters except release_at)
  const { data: debugAll, error: debugErr } = await supabase
    .from("orders")
    .select("id, escrow_release_at, escrow_released, is_disputed")

  console.log("🧪 ALL ORDERS SNAPSHOT:", debugAll)

  if (debugErr) {
    console.error("❌ Debug fetch failed", debugErr)
  }

  // 🔍 Lightweight check
  const { data: eligible, error: eligibleErr } = await supabase
    .from("orders")
    .select("id, escrow_release_at, escrow_released, is_disputed")
    .eq("escrow_released", false)
    .eq("is_disputed", false)
    .not("escrow_release_at", "is", null)
    .lte("escrow_release_at", now)
    .limit(1)

  console.log("🧪 ELIGIBLE RESULT:", eligible)

  if (eligibleErr) {
    console.error("❌ Eligible check failed", eligibleErr)
    return new Response("Error", { status: 500 })
  }

  if (!eligible?.length) {
    console.log("🚫 No eligible escrows found after filter")
    return Response.json({ processed: 0 })
  }

  // 🔥 Fetch all eligible
  const { data: orders, error: ordersErr } = await supabase
    .from("orders")
    .select("*")
    .eq("escrow_released", false)
    .eq("is_disputed", false)
    .not("escrow_release_at", "is", null)
    .lte("escrow_release_at", now)

  console.log("🧪 FULL ELIGIBLE ORDERS:", orders)

  if (ordersErr) {
    console.error("❌ Orders fetch failed", ordersErr)
    return new Response("Error", { status: 500 })
  }

  let processed = 0

  for (const order of orders ?? []) {
    try {
      console.log("💰 Processing order:", order.id)

      // 🔒 Safety
      if (!order.escrow_funded_at) {
        console.warn("⚠️ Skipping — escrow not funded:", order.id)
        continue
      }

      const balance = await stripe.balance.retrieve()
      const availableUSD =
        balance.available.find(b => b.currency === "usd")?.amount ?? 0

      console.log("💵 Stripe available balance:", availableUSD)
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

      if (profileErr) {
        console.error("❌ Profile fetch error", profileErr)
        continue
      }

      if (!profile?.stripe_account_id) {
        console.warn("⚠️ No stripe account for seller:", order.seller_id)
        continue
      }

      console.log("🏦 Sending to Stripe account:", profile.stripe_account_id)

      // 💸 TRANSFER
      const transfer = await stripe.transfers.create({
        amount: order.seller_net_cents,
        currency: "usd",
        destination: profile.stripe_account_id,
        metadata: {
          order_id: order.id,
        },
      })

      console.log("✅ Stripe transfer created:", transfer.id)

      // 🧠 FINALIZE
      const { error: rpcError } = await supabase.rpc("release_order_escrow", {
        p_order_id: order.id,
        p_stripe_transfer_id: transfer.id,
      })

      if (rpcError) {
        console.error("❌ RPC failed:", rpcError)
        continue
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