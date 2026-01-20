/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

// ---------------- ENV ----------------
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

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
    // 🔑 CRITICAL FIX — ASYNC VERSION FOR DENO
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    )
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return new Response("Invalid signature", { status: 400 })
  }

  // ---------------- EVENT HANDLING ----------------
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.order_id

    if (!orderId) {
      console.error("Missing order_id in metadata")
      return new Response("Missing order_id", { status: 400 })
    }

    const shipping = session.shipping_details
    const address = shipping?.address

    const { error } = await supabase
      .from("orders")
      .update({
        status: "paid",
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent,
        shipping_name: shipping?.name ?? null,
        shipping_line1: address?.line1 ?? null,
        shipping_line2: address?.line2 ?? null,
        shipping_city: address?.city ?? null,
        shipping_state: address?.state ?? null,
        shipping_postal_code: address?.postal_code ?? null,
        shipping_country: address?.country ?? null,
        shipping_phone: session.customer_details?.phone ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (error) {
      console.error("Order update failed:", error)
      return new Response("Database update failed", { status: 500 })
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
