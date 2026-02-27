/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import Stripe from "npm:stripe@13.11.0"

console.log("🚀 admin-release-escrow function booted")

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
    headers: { "Content-Type": "application/json", ...corsHeaders },
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

    if (!dispute_id) return json(400, { error: "Missing dispute_id" })

    /* ---------------- VERIFY ADMIN ---------------- */
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return json(401, { error: "Missing auth header" })

    const token = authHeader.replace("Bearer ", "")

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      console.error("❌ auth.getUser failed:", userError)
      return json(401, { error: "Unauthorized" })
    }

    const { data: adminProfile, error: adminErr } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    if (adminErr) {
      console.error("❌ admin profile lookup failed:", adminErr)
      return json(500, { error: "Profile lookup failed" })
    }

    if (!adminProfile?.is_admin) return json(403, { error: "Not admin" })

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

    /* ---------------- FETCH ORDER (same fields as execute-stripe-payout) ---------------- */
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id,
        buyer_id,
        seller_id,
        seller_net_cents,
        escrow_released,
        escrow_funded_at,
        escrow_status,
        status,
        stripe_transfer_id,
        currency
      `)
      .eq("id", dispute.order_id)
      .single()

    if (orderErr || !order) {
      console.error("❌ Order not found", orderErr)
      return json(404, { error: "Order not found" })
    }

    console.log("🧾 order precheck:", {
      order_id: order.id,
      status: order.status,
      escrow_status: order.escrow_status,
      escrow_released: order.escrow_released,
      escrow_funded_at: order.escrow_funded_at,
      stripe_transfer_id: order.stripe_transfer_id,
      seller_id: order.seller_id,
      seller_net_cents: order.seller_net_cents,
    })

    /* ---------------- BUSINESS RULES ---------------- */
    if (order.escrow_released || order.escrow_status === "released") {
      return json(200, {
        success: true,
        already_released: true,
        stripe_transfer_id: order.stripe_transfer_id ?? null,
      })
    }

    if (order.escrow_status === "refunded" || order.status === "refunded") {
      return json(400, { error: "Cannot release — order is refunded" })
    }

    if (!order.escrow_funded_at) {
      return json(409, { error: "Escrow not funded" })
    }

    if (!order.seller_id) return json(400, { error: "Missing seller_id" })

    if (typeof order.seller_net_cents !== "number" || order.seller_net_cents <= 0) {
      return json(400, { error: "Invalid seller_net_cents" })
    }

    const seller_id = order.seller_id
    const payout_cents = order.seller_net_cents

    /* ---------------- LOCK SELLER WALLET (same as execute-stripe-payout) ---------------- */
    const { error: lockErr } = await supabase
      .from("wallets")
      .update({ payout_locked: true })
      .eq("user_id", seller_id)
      .eq("payout_locked", false)

    if (lockErr) {
      return json(409, { error: "Wallet is locked" })
    }

    /* ---------------- CHECK PLATFORM STRIPE BALANCE (same) ---------------- */
    const balance = await stripe.balance.retrieve()
    const currency = (order.currency ?? "usd").toLowerCase()
    const available = balance.available.find((b) => b.currency === currency)?.amount ?? 0

    if (available < payout_cents) {
      await supabase.from("wallets").update({ payout_locked: false }).eq("user_id", seller_id)

      return json(409, {
        error: "Stripe funds not available yet",
        code: "STRIPE_FUNDS_PENDING",
      })
    }

    /* ---------------- GET SELLER STRIPE ACCOUNT ---------------- */
    const { data: sellerProfile, error: sellerProfileErr } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", seller_id)
      .single()

    if (sellerProfileErr || !sellerProfile?.stripe_account_id) {
      await supabase.from("wallets").update({ payout_locked: false }).eq("user_id", seller_id)
      return json(400, { error: "Seller Stripe account missing" })
    }

    /* ---------------- STRIPE TRANSFER PLATFORM → SELLER (same) ---------------- */
    let transfer
    try {
      transfer = await stripe.transfers.create(
        {
          amount: payout_cents,
          currency,
          destination: sellerProfile.stripe_account_id,
          metadata: {
            order_id: order.id,
            seller_id,
            dispute_id,
            admin_release: "true",
          },
        },
        { idempotencyKey: `admin_release_${order.id}` }
      )
    } catch (stripeErr) {
      console.error("❌ Stripe transfer error:", stripeErr)
      await supabase.from("wallets").update({ payout_locked: false }).eq("user_id", seller_id)
      return json(500, { error: "Stripe transfer error" })
    }

    if (!transfer?.id) {
      console.error("❌ Transfer failed:", transfer)
      return json(500, { error: "Transfer failed" })
    }

    /* ---------------- FINALIZE ESCROW VIA SAME RPC ---------------- */
    const { error: rpcErr } = await supabase.rpc("release_order_escrow", {
      p_order_id: order.id,
      p_stripe_transfer_id: transfer.id,
    })

    if (rpcErr) {
      console.error("❌ Ledger finalize failed", rpcErr)
      return json(500, {
        error: "Stripe paid but ledger finalize failed",
        stripe_transfer_id: transfer.id,
      })
    }

    /* ---------------- RESOLVE DISPUTE (SELLER WIN) ---------------- */
    const now = new Date().toISOString()

    const { error: disputeUpdateErr } = await supabase
      .from("disputes")
      .update({
        status: "resolved_seller",
        resolution: "release", // must exist in disputes constraint
        resolved_at: now,
        resolved_by: user.id,
        admin_notes,
      })
      .eq("id", dispute.id)

    if (disputeUpdateErr) {
      console.error("❌ Dispute update failed:", disputeUpdateErr)
      return json(500, {
        error: "Escrow released, but dispute update failed",
        stripe_transfer_id: transfer.id,
      })
    }

    console.log("✅ Admin release successful:", transfer.id)

    return json(200, {
      success: true,
      stripe_transfer_id: transfer.id,
    })
  } catch (err) {
    console.error("🔥 admin-release-escrow error:", err)
    return json(500, { error: "Internal error" })
  }
})