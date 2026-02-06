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
    .select(
      "id,status,listing_id,offer_id,amount_cents,paid_at,escrow_funded_at"
    )
    .eq("id", orderId)
    .single()

  if (error || !order) {
    console.error("❌ Order not found:", orderId, error)
    return json(404, { error: "Order not found" })
  }

  // 🔒 Idempotency
  if (order.paid_at || order.escrow_funded_at || order.status === "paid") {
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

  // ---------------- RESOLVE LISTING (OFFER SAFE) ----------------
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

    // 🔑 CRITICAL FIX: persist listing_id onto order
    await supabase
      .from("orders")
      .update({ listing_id: resolvedListingId })
      .eq("id", orderId)
  }

  // ---------------- UPDATE ORDER ----------------
  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: now,

      stripe_session_id: sessionId ?? null,
      stripe_payment_intent: paymentIntentId ?? null,

      escrow_status: "pending",
      escrow_funded_at: now,

      updated_at: now,
    })
    .eq("id", orderId)

  if (updateErr) {
    console.error("❌ Order update failed:", orderId, updateErr)
    return json(500, { error: "Order update failed" })
  }

  console.log("✅ Order PAID + escrow pending:", orderId)

  // ---------------- MARK LISTING SOLD ----------------
  if (resolvedListingId) {
    const { error: listingErr } = await supabase
      .from("listings")
      .update({
        is_sold: true,
        status: "inactive",
        updated_at: now,
      })
      .eq("id", resolvedListingId)

    if (listingErr) {
      console.warn("⚠️ Listing update failed:", listingErr)
    } else {
      console.log("📦 Listing marked sold:", resolvedListingId)
    }
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

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.order_id

    if (!orderId) {
      return new Response("Missing order_id", { status: 400 })
    }

    return await markOrderPaid({
      orderId,
      sessionId: session.id,
      paymentIntentId: session.payment_intent as string | null,
      amountTotal: session.amount_total ?? null,
    })
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
