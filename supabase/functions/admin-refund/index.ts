/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

console.log("🚀 admin-refund function booted")

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  // 🔥 HANDLE CORS PREFLIGHT (THIS FIXES YOUR ERROR)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { dispute_id, admin_notes } = await req.json()

    if (!dispute_id) {
      return new Response(
        JSON.stringify({ error: "Missing dispute_id" }),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    /* ---------------- VERIFY ADMIN ---------------- */

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing auth header" }),
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.replace("Bearer ", "")

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      )
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Not admin" }),
        { status: 403, headers: corsHeaders }
      )
    }

    /* ---------------- LOAD DISPUTE ---------------- */

    const { data: dispute, error: disputeError } = await supabase
      .from("disputes")
      .select("*")
      .eq("id", dispute_id)
      .single()

    if (disputeError || !dispute) {
      return new Response(
        JSON.stringify({ error: "Dispute not found" }),
        { status: 404, headers: corsHeaders }
      )
    }

    if (
      dispute.status === "resolved_buyer" ||
      dispute.status === "resolved_seller"
    ) {
      return new Response(
        JSON.stringify({ error: "Dispute already resolved" }),
        { status: 400, headers: corsHeaders }
      )
    }

    /* ---------------- LOAD ORDER ---------------- */

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", dispute.order_id)
      .single()

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: corsHeaders }
      )
    }

    if (!order.stripe_payment_intent) {
      return new Response(
        JSON.stringify({ error: "Missing Stripe payment intent" }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (order.status === "refunded") {
      return new Response(
        JSON.stringify({ error: "Order already refunded" }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (order.escrow_status === "released") {
      return new Response(
        JSON.stringify({
          error: "Cannot refund — escrow already released",
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    /* ---------------- STRIPE REFUND ---------------- */

    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent,
    })

    if (!refund || refund.status !== "succeeded") {
      return new Response(
        JSON.stringify({ error: "Refund failed" }),
        { status: 500, headers: corsHeaders }
      )
    }

    const now = new Date().toISOString()

    /* ---------------- UPDATE ORDER ---------------- */

    await supabase
      .from("orders")
      .update({
        status: "refunded",
        escrow_status: "refunded",
        updated_at: now,
      })
      .eq("id", order.id)

    /* ---------------- UPDATE DISPUTE ---------------- */
    // 🔥 FIXED: resolution must match DB constraint ('refund', 'release', 'partial_refund')

    await supabase
      .from("disputes")
      .update({
        status: "resolved_buyer",
        resolution: "refund", // ✅ matches your CHECK constraint
        resolved_at: now,
        resolved_by: user.id,
        admin_notes: admin_notes ?? null,
      })
      .eq("id", dispute.id)

    console.log("✅ Refund successful:", refund.id)

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
      }),
      { status: 200, headers: corsHeaders }
    )
  } catch (err) {
    console.error("🔥 admin-refund error:", err)
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: corsHeaders }
    )
  }
})
