/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

console.log("🚀 admin-release-escrow booted")

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const dispute_id = body?.dispute_id

    if (!dispute_id) {
      return json(400, { error: "Missing dispute_id" })
    }

    // 🔎 Load dispute
    const { data: dispute } = await supabase
      .from("disputes")
      .select("*")
      .eq("id", dispute_id)
      .single()

    if (!dispute) {
      return json(404, { error: "Dispute not found" })
    }

    if (dispute.resolved_at) {
      return json(400, { error: "Dispute already resolved" })
    }

    // 🔎 Load order
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", dispute.order_id)
      .single()

    if (!order) {
      return json(404, { error: "Order not found" })
    }

    // 🛑 Prevent double Stripe transfers
    if (order.escrow_released === true) {
      return json(400, { error: "Escrow already released" })
    }

    console.log("💰 Releasing escrow for order:", order.id)

    const balance = await stripe.balance.retrieve()
    const availableUSD =
      balance.available.find(b => b.currency === "usd")?.amount ?? 0

    if (availableUSD < order.seller_net_cents) {
      return json(400, { error: "Stripe funds not available yet" })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", order.seller_id)
      .single()

    if (!profile?.stripe_account_id) {
      return json(400, { error: "Seller Stripe account missing" })
    }

    // 💸 Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: order.seller_net_cents,
      currency: "usd",
      destination: profile.stripe_account_id,
      metadata: {
        order_id: order.id,
      },
    })

    // ✅ Restore order so RPC guard passes
    await supabase
      .from("orders")
      .update({
        is_disputed: false,
        status: "shipped",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    // 🧠 Release escrow in DB
    const { error: releaseErr } = await supabase.rpc("release_order_escrow", {
      p_order_id: order.id,
      p_stripe_transfer_id: transfer.id,
    })

    if (releaseErr) {
      console.error("❌ release_order_escrow failed", releaseErr)
      return json(500, { error: "Escrow release failed" })
    }

    // 🧾 Resolve dispute
    await supabase
      .from("disputes")
      .update({
        status: "resolved_seller",
        resolution: "release",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", dispute.id)

    console.log("✅ Escrow released:", order.id)

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
          body: "Your dispute was resolved in your favor and funds have been released.",
          data: {
            route: `/seller-hub/orders/${order.id}`,
          },
          dedupeKey: `admin-release-seller-${order.id}`,
        }),
      })
    } catch (e) {
      console.log("⚠️ Seller release notification failed:", e)
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
          title: "Dispute Closed",
          body: "The dispute was resolved in the seller's favor and payment has been released.",
          data: {
            route: `/buyer-hub/orders/${order.id}`,
          },
          dedupeKey: `admin-release-buyer-${order.id}`,
        }),
      })
    } catch (e) {
      console.log("⚠️ Buyer release notification failed:", e)
    }

    return json(200, { success: true })

  } catch (err) {
    console.error("🔥 admin-release-escrow error", err)
    return json(500, { error: "Internal error" })
  }
})