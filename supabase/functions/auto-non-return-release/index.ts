/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

console.log("🚀 auto_non_return_release booted")

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const CRON_SECRET = Deno.env.get("CRON_SECRET")

/**
 * ✅ Subtract business days (Mon–Fri only, ignores holidays)
 */
function subtractBusinessDays(from: Date, businessDays: number) {
  const d = new Date(from)
  let remaining = businessDays

  while (remaining > 0) {
    d.setDate(d.getDate() - 1)
    const day = d.getDay() // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) remaining--
  }

  return d.toISOString()
}

Deno.serve(async (req) => {
  try {
    // 🔐 SECRET CHECK
    const headerSecret = req.headers.get("x-cron-secret")

    if (!CRON_SECRET || headerSecret !== CRON_SECRET) {
      console.warn("❌ Unauthorized auto non-return release attempt")
      return new Response("Unauthorized", { status: 401 })
    }

    console.log("🔎 Checking for eligible non-return escrow releases...")

    // ✅ 3 business days ago cutoff based on return_requested_at
    const threeBizDaysAgo = subtractBusinessDays(new Date(), 3)
    console.log("🕒 3 business days ago cutoff:", threeBizDaysAgo)

    // 🔍 Lightweight existence check
    const { data: eligible, error: eligibleErr } = await supabase
      .from("orders")
      .select("id")
      .eq("status", "return_started")
      .eq("is_disputed", false)
      .eq("return_received", false)
      .eq("escrow_released", false)
      .eq("escrow_status", "held")
      .is("return_tracking_number", null)
      .not("return_requested_at", "is", null)
      .lte("return_requested_at", threeBizDaysAgo)
      .limit(1)

    if (eligibleErr) {
      console.error("❌ Eligible non-return check failed:", eligibleErr)
      return new Response(
        JSON.stringify({ step: "eligible_check", error: eligibleErr }),
        { status: 500 }
      )
    }

    if (!eligible?.length) {
      console.log("✅ No eligible non-return releases")
      return Response.json({ processed: 0 })
    }

    console.log("🔥 Eligible non-return exists, fetching full rows...")

    // 🔥 Fetch all eligible
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "return_started")
      .eq("is_disputed", false)
      .eq("return_received", false)
      .eq("escrow_released", false)
      .eq("escrow_status", "held")
      .is("return_tracking_number", null)
      .not("return_requested_at", "is", null)
      .lte("return_requested_at", threeBizDaysAgo)

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
        console.log("⏱️ Non-return timeout → releasing escrow for:", order.id)

        if (!order.escrow_funded_at) {
          console.warn("⚠️ Missing escrow_funded_at, skipping:", order.id)
          continue
        }

        if (!order.seller_id) {
          console.warn("⚠️ Missing seller_id, skipping:", order.id)
          continue
        }

        if (!order.seller_net_cents || order.seller_net_cents <= 0) {
          console.warn("⚠️ Missing/invalid seller_net_cents, skipping:", order.id)
          continue
        }

        const balance = await stripe.balance.retrieve()
        const availableUSD =
          balance.available.find((b) => b.currency === "usd")?.amount ?? 0

        if (availableUSD < order.seller_net_cents) {
          console.warn("⚠️ Stripe funds not available yet, skipping:", order.id)
          continue
        }

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("stripe_account_id")
          .eq("id", order.seller_id)
          .single()

        if (profileErr) {
          console.error("❌ Failed to fetch seller stripe account:", profileErr)
          continue
        }

        if (!profile?.stripe_account_id) {
          console.warn("⚠️ Seller missing stripe_account_id, skipping:", order.id)
          continue
        }

        const transfer = await stripe.transfers.create({
          amount: order.seller_net_cents,
          currency: "usd",
          destination: profile.stripe_account_id,
          metadata: {
            order_id: order.id,
            reason: "return_tracking_not_uploaded_timeout",
          },
        })

        console.log("✅ Stripe transfer created:", transfer.id)

        const { error: rpcError } = await supabase.rpc("release_order_escrow", {
          p_order_id: order.id,
          p_stripe_transfer_id: transfer.id,
        })

        if (rpcError) {
          console.error("❌ RPC release_order_escrow failed:", rpcError)
          continue
        }

        console.log("✅ Escrow released (non-return timeout):", order.id)
      } catch (innerErr) {
        console.error("❌ Error processing order:", order.id, innerErr)
        continue
      }
    }

    return Response.json({ processed: orders?.length ?? 0 })
  } catch (outerErr) {
    console.error("❌ Fatal auto non-return release error:", outerErr)
    return new Response(
      JSON.stringify({ step: "fatal", error: outerErr?.message ?? outerErr }),
      { status: 500 }
    )
  }
})