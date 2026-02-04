/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

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

// ---------------- HANDLER ----------------
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    )
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return new Response("Invalid signature", { status: 400 })
  }

  // ---------------- EVENT ----------------
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    const offerId = session.metadata?.offer_id
    if (!offerId) {
      console.error("Missing offer_id in metadata")
      return new Response("Missing offer_id", { status: 400 })
    }

    // 🔁 LOAD OFFER
    const { data: offer, error: offerErr } = await supabase
      .from("offers")
      .select(`
        id,
        buyer_id,
        seller_id,
        listing_id,
        accepted_price,
        accepted_shipping_type,
        accepted_shipping_price,
        accepted_title,
        accepted_image_url,
        status
      `)
      .eq("id", offerId)
      .single()

    if (offerErr || !offer) {
      console.error("Offer not found", offerErr)
      return new Response("Offer not found", { status: 404 })
    }

    // 🔒 IDEMPOTENCY GUARD (retry-safe)
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("offer_id", offer.id)
      .maybeSingle()

    if (existingOrder) {
      return new Response(
        JSON.stringify({ received: true, duplicate: true }),
        { status: 200 }
      )
    }

    // ---------------- CALCULATIONS ----------------
    const itemPrice = Number(offer.accepted_price ?? 0)
    const shipping =
      offer.accepted_shipping_type === "buyer_pays"
        ? Number(offer.accepted_shipping_price ?? 0)
        : 0

    // Buyer fee = 1.5% protection + 2.9% + $0.30 processing
    const buyerFee = +(
      itemPrice * 0.015 +
      itemPrice * 0.029 +
      0.3
    ).toFixed(2)

    const total = +(itemPrice + shipping + buyerFee).toFixed(2)

    // ---------------- CREATE ORDER ----------------
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        buyer_id: offer.buyer_id,
        seller_id: offer.seller_id,
        listing_id: offer.listing_id,
        offer_id: offer.id,

        status: "paid",
        amount_cents: Math.round(total * 100),
        currency: "usd",

        image_url: offer.accepted_image_url,

        listing_snapshot: {
          title: offer.accepted_title,
          image_url: offer.accepted_image_url,
          item_price: itemPrice,
          shipping_price: shipping,
          buyer_fee: buyerFee,
          total,
        },

        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent ?? null,

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (orderErr || !order) {
      console.error("Order creation failed", orderErr)
      return new Response("Order creation failed", { status: 500 })
    }

    // ---------------- DEACTIVATE LISTING ----------------
    if (offer.listing_id) {
      await supabase
        .from("listings")
        .update({
          is_sold: true,
          status: "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("id", offer.listing_id)
    }

    // ---------------- EXPIRE OTHER OFFERS ----------------
    await supabase
      .from("offers")
      .update({
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("listing_id", offer.listing_id)
      .neq("id", offer.id)
      .in("status", ["pending", "countered"])

    // ---------------- MARK OFFER PAID ----------------
    await supabase
      .from("offers")
      .update({
        status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", offer.id)
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
