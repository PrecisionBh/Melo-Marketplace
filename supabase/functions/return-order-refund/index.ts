/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import Stripe from "npm:stripe@13.11.0"

console.log("🚀 return-order-refund function booted")

// ---------------- ENV ----------------
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY")
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL")
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

// ---------------- CLIENTS ----------------
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ---------------- CORS ----------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// ---------------- HELPERS ----------------
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  })
}

// ---------------- HANDLER ----------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    })
  }

  try {
    const { order_id } = await req.json()

    if (!order_id) {
      return json(400, { error: "Missing order_id" })
    }

    /* ---------------- AUTH SELLER ---------------- */
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return json(401, { error: "Missing auth header" })
    }

    const token = authHeader.replace("Bearer ", "")

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return json(401, { error: "Unauthorized" })
    }

    /* ---------------- LOAD ORDER ---------------- */
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single()

    if (orderError || !order) {
      return json(404, { error: "Order not found" })
    }

    if (order.seller_id !== user.id) {
      return json(403, {
        error: "Only the seller can confirm return receipt",
      })
    }

    if (order.status !== "return_started") {
      return json(400, {
        error: "Order is not in return started state",
      })
    }

    if (order.escrow_status === "refunded") {
      return json(400, { error: "Order already refunded" })
    }

    if (order.escrow_status === "released") {
      return json(400, {
        error: "Cannot refund — escrow already released to seller",
      })
    }

    if (!order.return_tracking_number) {
      return json(400, {
        error: "Return tracking has not been submitted by the buyer",
      })
    }

    if (!order.return_shipped_at) {
      return json(400, {
        error: "Return shipment not confirmed yet",
      })
    }

    if (order.return_received === true) {
      return json(400, {
        error: "Return already marked as received",
      })
    }

    if (!order.stripe_payment_intent) {
      return json(400, {
        error: "Missing Stripe payment intent",
      })
    }

    const refundableAmount =
      (order.item_price_cents ?? 0) +
      (order.shipping_amount_cents ?? 0) +
      (order.tax_cents ?? 0)

    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent,
      amount: refundableAmount,
    })

    if (!refund || refund.status !== "succeeded") {
      return json(500, { error: "Refund failed" })
    }

    const now = new Date().toISOString()

    if (order.wallet_credited && typeof order.seller_net_cents === "number") {
      await supabase.rpc("increment_wallet_pending", {
        p_user_id: order.seller_id,
        p_amount_cents: -order.seller_net_cents,
      })
    }

    await supabase
      .from("orders")
      .update({
        status: "returned",
        escrow_status: "refunded",
        return_received: true,
        wallet_credited: false,
        updated_at: now,
      })
      .eq("id", order.id)

    /* ---------------- NOTIFICATIONS (NEW SYSTEM) ---------------- */
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
          title: "Return Approved & Refunded 💸",
          body:
            "The seller has received your returned item and your refund has been issued.",
          data: {
            route: `/buyer-hub/orders/${order.id}`,
          },
          dedupeKey: `return-refund-buyer-${order.id}`,
        }),
      })

      await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          userId: order.seller_id,
          type: "order",
          title: "Return Completed & Refunded",
          body:
            "You confirmed the return and the buyer has been refunded.",
          data: {
            route: `/seller-hub/orders/${order.id}`,
          },
          dedupeKey: `return-refund-seller-${order.id}`,
        }),
      })
    } catch (err) {
      console.log("⚠️ Return refund notification failed:", err)
    }

    return json(200, {
      success: true,
      refundId: refund.id,
    })
  } catch (err) {
    return json(500, { error: "Internal error" })
  }
})