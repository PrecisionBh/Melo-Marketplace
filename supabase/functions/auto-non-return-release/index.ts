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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const CRON_SECRET = Deno.env.get("CRON_SECRET")

function subtractBusinessDays(from: Date, businessDays: number) {
  const d = new Date(from)
  let remaining = businessDays

  while (remaining > 0) {
    d.setDate(d.getDate() - 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) remaining--
  }

  return d.toISOString()
}

Deno.serve(async (req) => {
  try {
    const headerSecret = req.headers.get("x-cron-secret")

    if (!CRON_SECRET || headerSecret !== CRON_SECRET) {
      console.warn("❌ Unauthorized auto non-return release attempt")
      return new Response("Unauthorized", { status: 401 })
    }

    console.log("🔎 Checking for eligible non-return escrow releases...")

    const threeBizDaysAgo = subtractBusinessDays(new Date(), 3)

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
      return new Response("Error", { status: 500 })
    }

    if (!orders?.length) {
      console.log("✅ No eligible non-return releases")
      return Response.json({ processed: 0 })
    }

    console.log(`📦 Orders to process: ${orders.length}`)

    const balance = await stripe.balance.retrieve()
    const availableUSD =
      balance.available.find((b) => b.currency === "usd")?.amount ?? 0

    console.log("💵 Stripe available balance:", availableUSD)

    let processed = 0

    for (const order of orders) {
      try {
        console.log("⏱️ Non-return timeout → releasing:", order.id)

        if (!order.escrow_funded_at) continue
        if (!order.seller_id) continue
        if (!order.seller_net_cents || order.seller_net_cents <= 0) continue

        if (availableUSD < order.seller_net_cents) {
          console.warn("⚠️ Not enough Stripe balance:", order.id)
          continue
        }

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("stripe_account_id")
          .eq("id", order.seller_id)
          .single()

        if (profileErr || !profile?.stripe_account_id) {
          console.warn("⚠️ Missing stripe account:", order.id)
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
              body: "The buyer did not return the item in time. Funds have been released to you.",
              data: {
                route: `/seller-hub/orders/${order.id}`,
              },
              dedupeKey: `non-return-release-seller-${order.id}`,
            }),
          })
        } catch (e) {
          console.log("⚠️ Seller non-return notification failed:", e)
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
              title: "Return Window Expired",
              body: "You did not upload return tracking in time. The order has been completed and payment released.",
              data: {
                route: `/buyer-hub/orders/${order.id}`,
              },
              dedupeKey: `non-return-release-buyer-${order.id}`,
            }),
          })
        } catch (e) {
          console.log("⚠️ Buyer non-return notification failed:", e)
        }

        processed++
        console.log("✅ Escrow released:", order.id)

      } catch (err) {
        console.error("❌ Order error:", order.id, err)
      }
    }

    console.log("🏁 FINAL PROCESSED:", processed)

    return Response.json({ processed })

  } catch (err) {
    console.error("❌ Fatal error:", err)
    return new Response("Server error", { status: 500 })
  }
})