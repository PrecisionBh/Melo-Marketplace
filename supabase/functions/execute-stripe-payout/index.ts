/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

console.log("🚀 execute-stripe-payout (patched) booted")

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

Deno.serve(async (req) => {
  let body
  try {
    body = await req.json()
  } catch {
    return new Response("Invalid JSON body", { status: 400 })
  }

  const { user_id, order_id } = body ?? {}
  if (!user_id || !order_id) {
    return new Response("Missing user_id or order_id", { status: 400 })
  }

  console.log("➡️ Escrow release requested", { user_id, order_id })

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(`
      id,
      buyer_id,
      seller_id,
      seller_net_cents,
      escrow_released,
      escrow_funded_at,
      stripe_payment_intent
    `)
    .eq("id", order_id)
    .single()

  if (orderErr || !order) {
    return new Response("Order not found", { status: 404 })
  }

  if (order.buyer_id !== user_id) {
    return new Response("Unauthorized buyer", { status: 403 })
  }

  if (order.escrow_released) {
    return Response.json({ success: true, already_released: true })
  }

  if (!order.escrow_funded_at) {
    return new Response("Escrow not funded", { status: 409 })
  }

  if (!order.stripe_payment_intent) {
    return new Response("Missing stripe_payment_intent", { status: 400 })
  }

  const seller_id = order.seller_id
  const payout_cents = order.seller_net_cents

  console.log("💰 Payout:", payout_cents)

  // 🔒 Lock wallet
  const { error: lockErr } = await supabase
    .from("wallets")
    .update({ payout_locked: true })
    .eq("user_id", seller_id)
    .eq("payout_locked", false)

  if (lockErr) {
    return new Response("Wallet is locked", { status: 409 })
  }

  try {
    // 🔍 Seller stripe account
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", seller_id)
      .single()

    if (!profile?.stripe_account_id) {
      throw new Error("Seller Stripe account missing")
    }

    console.log("👤 Seller Stripe:", profile.stripe_account_id)

    const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent)

    console.log("🔍 PI:", {
      id: pi.id,
      latest_charge: pi.latest_charge,
    })

    if (!pi.latest_charge) {
      throw new Error("No charge found")
    }

    const chargeId = pi.latest_charge as string

    const transfer = await stripe.transfers.create({
      amount: payout_cents,
      currency: "usd",
      destination: profile.stripe_account_id,
      source_transaction: chargeId,
      metadata: { order_id },
    })

    console.log("✅ TRANSFER SUCCESS:", transfer.id)

    await supabase.rpc("release_order_escrow", {
      p_order_id: order_id,
      p_stripe_transfer_id: transfer.id,
    })

    // 🔓 UNLOCK WALLET FIRST (important)
    await supabase
      .from("wallets")
      .update({ payout_locked: false })
      .eq("user_id", seller_id)

    // 🔔 Notify seller
    try {
      await supabase.functions.invoke("send-notification", {
        body: {
          userId: seller_id,
          type: "wallet",
          title: "Funds Available 💰",
          body: `+$${(payout_cents / 100).toFixed(2)} is now available in your wallet.`,
          data: {
            route: "/wallet",
          },
          dedupeKey: `wallet-available-${order_id}`,
          email: true,
        },
      })

      console.log("🔔 Funds available notification sent")
    } catch (err) {
      console.error("⚠️ wallet notif failed", err)
    }

    return Response.json({
      success: true,
      stripe_transfer_id: transfer.id,
    })
  } catch (err: any) {
    console.error("💥 TRANSFER ERROR:", err)

    return new Response(
      JSON.stringify({
        error: err.message,
        code: err.code,
      }),
      { status: 500 }
    )
  } finally {
    // 🔓 ALWAYS UNLOCK WALLET (guaranteed safety)
    await supabase
      .from("wallets")
      .update({ payout_locked: false })
      .eq("user_id", seller_id)
  }
})