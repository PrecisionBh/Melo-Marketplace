/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import Stripe from "npm:stripe@13.11.0"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

serve(async (req) => {
  try {
    const { orderId } = await req.json()

    if (!orderId) {
      return new Response("Missing orderId", { status: 400 })
    }

    /* ---------------- FETCH ORDER ---------------- */

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return new Response("Order not found", { status: 404 })
    }

    /* ---------------- SAFETY CHECKS ---------------- */

    if (order.escrow_status === "released") {
      return new Response("Escrow already released", { status: 400 })
    }

    if (order.is_disputed) {
      return new Response("Cannot release disputed order", { status: 400 })
    }

    if (!order.stripe_payment_intent) {
      return new Response("Missing Stripe payment intent", { status: 400 })
    }

    if (!order.seller_net_cents) {
      return new Response("Missing seller net amount", { status: 400 })
    }

    /* ---------------- FETCH SELLER CONNECT ACCOUNT ---------------- */

    const { data: sellerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", order.seller_id)
      .single()

    if (profileError || !sellerProfile?.stripe_account_id) {
      return new Response(
        "Seller Stripe account not connected",
        { status: 400 }
      )
    }

    /* ---------------- STRIPE TRANSFER ---------------- */

    const transfer = await stripe.transfers.create({
      amount: order.seller_net_cents,
      currency: order.currency || "usd",
      destination: sellerProfile.stripe_account_id,
      source_transaction: order.stripe_payment_intent,
    })

    const now = new Date().toISOString()

    /* ---------------- UPDATE ORDER ---------------- */

    await supabase
      .from("orders")
      .update({
        escrow_status: "released",
        escrow_released: true,
        escrow_released_at: now,
        released_at: now,
        status: "completed",
        stripe_transfer_id: transfer.id,
        updated_at: now,
      })
      .eq("id", orderId)

    return new Response(
      JSON.stringify({
        success: true,
        transferId: transfer.id,
      }),
      { status: 200 }
    )

  } catch (err) {
    console.error("Admin release escrow error:", err)
    return new Response("Server error", { status: 500 })
  }
})
