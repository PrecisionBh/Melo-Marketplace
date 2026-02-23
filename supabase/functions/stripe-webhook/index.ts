/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import Stripe from "npm:stripe@13.11.0"

console.log("🚀 stripe-webhook loaded")

// ---------------- ENV ----------------
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY")
if (!STRIPE_WEBHOOK_SECRET) throw new Error("Missing STRIPE_WEBHOOK_SECRET")
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL")
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

// ---------------- CLIENTS ----------------
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

// ---------------- HELPERS ----------------
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

async function markOrderPaid(params: {
  orderId: string
  sessionId?: string | null
  paymentIntentId?: string | null
  amountTotal?: number | null
}) {
  const { orderId, sessionId, paymentIntentId, amountTotal } = params

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      status,
      listing_id,
      offer_id,
      amount_cents,
      item_price_cents,
      shipping_amount_cents,
      tax_cents,
      seller_id,
      buyer_id,
      paid_at,
      escrow_funded_at,
      wallet_credited
    `)
    .eq("id", orderId)
    .single()

  if (error || !order) {
    console.error("❌ Order not found:", orderId, error)
    return json(404, { error: "Order not found" })
  }

  if (order.wallet_credited && order.status === "paid") {
    console.log("⚠️ Order already paid:", orderId)
    return json(200, { received: true })
  }

  if (typeof amountTotal === "number" && amountTotal !== order.amount_cents) {
    console.error("❌ Amount mismatch", {
      orderId,
      stripe: amountTotal,
      db: order.amount_cents,
    })
    return new Response("Amount mismatch", { status: 400 })
  }

  const now = new Date().toISOString()

  let resolvedListingId = order.listing_id

  if (!resolvedListingId && order.offer_id) {
    const { data: offer, error: offerErr } = await supabase
      .from("offers")
      .select("listing_id")
      .eq("id", order.offer_id)
      .single()

    if (offerErr || !offer?.listing_id) {
      console.error("❌ Failed to resolve listing from offer", offerErr)
      return json(500, { error: "Offer listing resolution failed" })
    }

    resolvedListingId = offer.listing_id

    await supabase
      .from("orders")
      .update({ listing_id: resolvedListingId })
      .eq("id", orderId)
  }

  if (!order.item_price_cents) {
    console.error("❌ Missing item_price_cents for escrow", orderId)
    return json(500, { error: "Missing item price for escrow" })
  }

  const escrowAmountCents =
    order.item_price_cents + (order.shipping_amount_cents ?? 0)

  const sellerFeeCents = Math.round(escrowAmountCents * 0.04)
  const sellerNetCents = escrowAmountCents - sellerFeeCents

  console.log("🧮 Escrow calculation (fee includes shipping, excludes tax)", {
    orderId,
    item_price_cents: order.item_price_cents,
    shipping_amount_cents: order.shipping_amount_cents ?? 0,
    escrow_amount_cents: escrowAmountCents,
    seller_fee_cents: sellerFeeCents,
    seller_net_cents: sellerNetCents,
  })

  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: now,
      stripe_session_id: sessionId ?? null,
      stripe_payment_intent: paymentIntentId ?? null,
      seller_fee_cents: sellerFeeCents,
      seller_net_cents: sellerNetCents,
      seller_payout_cents: null,
      escrow_amount_cents: escrowAmountCents,
      tax_cents: order.tax_cents ?? 0,
      escrow_status: "pending",
      escrow_funded_at: now,
      updated_at: now,
    })
    .eq("id", orderId)

  if (updateErr) {
    console.error("❌ Order update failed:", orderId, updateErr)
    return json(500, { error: "Order update failed" })
  }

  console.log("✅ Order PAID + escrow funded:", orderId)

  if (!order.wallet_credited) {
    const { error: walletErr } = await supabase.rpc(
      "increment_wallet_pending",
      {
        p_user_id: order.seller_id,
        p_amount_cents: sellerNetCents,
      }
    )

    if (walletErr) {
      console.error("❌ Wallet pending credit failed", walletErr)
      return json(500, { error: "Wallet credit failed" })
    }

    await supabase
      .from("orders")
      .update({ wallet_credited: true })
      .eq("id", orderId)
  }

  if (resolvedListingId) {
    await supabase
      .from("listings")
      .update({
        is_sold: true,
        status: "inactive",
        updated_at: now,
      })
      .eq("id", resolvedListingId)
  }

  return json(200, { received: true })
}

async function activateMeloPro(params: {
  userId: string
  stripeCustomerId?: string | null
  subscriptionId?: string | null
}) {
  const { userId, stripeCustomerId, subscriptionId } = params

  const now = new Date()
  const nextMonth = new Date()
  nextMonth.setMonth(now.getMonth() + 1)

  const { error } = await supabase
    .from("profiles")
    .update({
      is_pro: true,
      pro_activated_at: now.toISOString(),
      pro_expires_at: nextMonth.toISOString(),
      boosts_remaining: 10,
      stripe_customer_id: stripeCustomerId ?? null,
      stripe_subscription_id: subscriptionId ?? null,
      updated_at: now.toISOString(),
    })
    .eq("id", userId)

  if (error) {
    console.error("❌ Failed to activate Melo Pro:", error)
    return json(500, { error: "Failed to activate Melo Pro" })
  }

  return json(200, { received: true })
}

// ---------------- HANDLER ----------------
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 })
  }

  const body = new Uint8Array(await req.arrayBuffer())

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error("❌ Stripe signature verification failed", err)
    return new Response("Invalid signature", { status: 400 })
  }

  // ⭐⭐⭐ ONLY CHANGE IN WHOLE FILE (supports Pro + Orders)
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}

    const orderId = metadata.order_id
    const userId = metadata.user_id
    const type = metadata.type

    // 🌟 Melo Pro subscription flow (NEW)
    if (type === "melo_pro_subscription" && userId) {
      return await activateMeloPro({
        userId,
        stripeCustomerId: session.customer as string | null,
        subscriptionId: session.subscription as string | null,
      })
    }

    // 🛒 Existing marketplace order flow (UNCHANGED behavior)
    if (orderId) {
      return await markOrderPaid({
        orderId,
        sessionId: session.id,
        paymentIntentId: session.payment_intent as string | null,
        amountTotal: session.amount_total ?? null,
      })
    }

    // Safety fallback (prevents crashes)
    return json(200, { received: true })
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent
    const orderId = intent.metadata?.order_id

    if (!orderId) return json(200, { received: true })

    return await markOrderPaid({
      orderId,
      paymentIntentId: intent.id,
      amountTotal: intent.amount_received ?? null,
    })
  }

  return json(200, { received: true })
})