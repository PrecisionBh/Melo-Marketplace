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

const CRON_SECRET = Deno.env.get("CRON_SECRET") // ✅ THIS READS YOUR SECRET

Deno.serve(async (req) => {
  // 🔐 SECRET CHECK
  const headerSecret = req.headers.get("x-cron-secret")

  if (!CRON_SECRET || headerSecret !== CRON_SECRET) {
    console.warn("❌ Unauthorized auto release attempt")
    return new Response("Unauthorized", { status: 401 })
  }

  console.log("🔎 Checking for eligible escrows...")

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString()

  // 🔍 Lightweight check first
  const { data: eligible, error: eligibleErr } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "shipped")
    .eq("escrow_released", false)
    .eq("is_disputed", false)
    .lte("shipped_at", sevenDaysAgo)
    .limit(1)

  if (eligibleErr) {
    console.error("❌ Eligible check failed", eligibleErr)
    return new Response("Error", { status: 500 })
  }

  if (!eligible?.length) {
    console.log("✅ No eligible escrows")
    return Response.json({ processed: 0 })
  }

  // 🔥 Fetch all eligible
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("status", "shipped")
    .eq("escrow_released", false)
    .eq("is_disputed", false)
    .lte("shipped_at", sevenDaysAgo)

  for (const order of orders ?? []) {
    try {
      console.log("💰 Processing order:", order.id)

      if (!order.escrow_funded_at) continue

      const balance = await stripe.balance.retrieve()
      const availableUSD =
        balance.available.find(b => b.currency === "usd")?.amount ?? 0

      if (availableUSD < order.seller_net_cents) {
        console.warn("⚠️ Stripe funds not available yet")
        continue
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", order.seller_id)
        .single()

      if (!profile?.stripe_account_id) continue

      const transfer = await stripe.transfers.create({
        amount: order.seller_net_cents,
        currency: "usd",
        destination: profile.stripe_account_id,
        metadata: {
          order_id: order.id,
        },
      })

      await supabase.rpc("release_order_escrow", {
        p_order_id: order.id,
        p_stripe_transfer_id: transfer.id,
      })

      console.log("✅ Escrow released:", order.id)

    } catch (err) {
      console.error("❌ Failed processing order:", order.id, err)
    }
  }

  return Response.json({ processed: orders?.length ?? 0 })
})