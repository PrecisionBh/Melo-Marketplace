/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import Stripe from "npm:stripe@13.11.0"

console.log("🚀 admin-refund function booted")

// ---------------- ENV ----------------
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY")
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL")
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

// ---------------- CLIENTS ----------------
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" })
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
    const payload = await req.json().catch(() => null)
    console.log("📦 incoming payload:", payload)

    const dispute_id = payload?.dispute_id
    const admin_notes = payload?.admin_notes ?? null

    if (!dispute_id) {
      return json(400, { error: "Missing dispute_id" })
    }

    /* ---------------- AUTH USER (ADMIN) ---------------- */
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
      console.error("❌ auth.getUser failed:", userError)
      return json(401, { error: "Unauthorized" })
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    if (profileErr) {
      console.error("❌ profile lookup failed:", profileErr)
      return json(500, { error: "Profile lookup failed" })
    }

    if (!profile?.is_admin) {
      return json(403, { error: "Not admin" })
    }

    /* ---------------- LOAD DISPUTE ---------------- */
    const { data: dispute, error: disputeError } = await supabase
      .from("disputes")
      .select("*")
      .eq("id", dispute_id)
      .single()

    if (disputeError || !dispute) {
      console.error("❌ Dispute not found:", disputeError)
      return json(404, { error: "Dispute not found" })
    }

    if (dispute.status === "resolved_buyer" || dispute.status === "resolved_seller") {
      return json(400, { error: "Dispute already resolved" })
    }

    /* ---------------- LOAD ORDER ---------------- */
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", dispute.order_id)
      .single()

    if (orderError || !order) {
      console.error("❌ Order not found:", orderError)
      return json(404, { error: "Order not found" })
    }

    console.log("💳 order stripe fields:", {
      order_id: order.id,
      stripe_payment_intent: order.stripe_payment_intent,
      status: order.status,
      escrow_status: order.escrow_status,
    })

    if (!order.stripe_payment_intent) {
      return json(400, { error: "Missing Stripe payment intent" })
    }

    if (order.status === "refunded") {
      return json(400, { error: "Order already refunded" })
    }

    if (order.escrow_status === "released") {
      return json(400, { error: "Cannot refund — escrow already released" })
    }

    /* ---------------- STRIPE REFUND (ITEM + SHIPPING + TAX, EXCLUDES BUYER FEE) ---------------- */
    const refundableAmount =
      (order.item_price_cents ?? 0) +
      (order.shipping_amount_cents ?? 0) +
      (order.tax_cents ?? 0)

    console.log("💸 Creating admin refund (excluding buyer fee):", {
      order_id: order.id,
      refundableAmount,
      item_price_cents: order.item_price_cents,
      shipping_amount_cents: order.shipping_amount_cents,
      tax_cents: order.tax_cents,
      buyer_fee_cents: order.buyer_fee_cents,
    })

    if (refundableAmount <= 0) {
      return json(400, { error: "Invalid refundable amount" })
    }

    let refund
    try {
      refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent,
        amount: refundableAmount,
      })
    } catch (stripeErr) {
      console.error("❌ Stripe refund error:", stripeErr)
      return json(500, { error: "Stripe refund error" })
    }

    // accept succeeded OR pending
    if (!refund || (refund.status !== "succeeded" && refund.status !== "pending")) {
      console.error("❌ Refund failed:", refund)
      return json(500, { error: "Refund failed", status: refund?.status ?? null })
    }

    const now = new Date().toISOString()

    /* ---------------- REVERSE SELLER PENDING WALLET (THIS ORDER ONLY) ---------------- */
    if (order.wallet_credited && typeof order.seller_net_cents === "number") {
      console.log("↩️ Reversing seller pending wallet (per-order):", {
        seller_id: order.seller_id,
        amount: order.seller_net_cents,
      })

      const { error: walletErr } = await supabase.rpc("increment_wallet_pending", {
        p_user_id: order.seller_id,
        p_amount_cents: -order.seller_net_cents,
      })

      if (walletErr) {
        console.error("❌ Wallet reversal failed:", walletErr)
        return json(500, { error: "Wallet reversal failed" })
      }
    }

    /* ---------------- UPDATE ORDER ---------------- */
    const { error: orderUpdateErr } = await supabase
      .from("orders")
      .update({
        status: "refunded",
        escrow_status: "refunded",
        wallet_credited: false,
        updated_at: now,
      })
      .eq("id", order.id)

    if (orderUpdateErr) {
      console.error("❌ Order update failed:", orderUpdateErr)
      return json(500, { error: "Failed to update order" })
    }

    /* ---------------- UPDATE DISPUTE ---------------- */
    const { error: disputeUpdateErr } = await supabase
      .from("disputes")
      .update({
        status: "resolved_buyer",
        resolution: "refund", // must match CHECK constraint
        resolved_at: now,
        resolved_by: user.id,
        admin_notes,
      })
      .eq("id", dispute.id)

    if (disputeUpdateErr) {
      console.error("❌ Dispute update failed:", disputeUpdateErr)
      return json(500, { error: "Failed to update dispute" })
    }

    console.log("✅ Admin refund successful:", refund.id, "status:", refund.status)

    return json(200, {
      success: true,
      refundId: refund.id,
      refundStatus: refund.status,
    })
  } catch (err) {
    console.error("🔥 admin-refund error:", err)
    return json(500, { error: "Internal error" })
  }
})