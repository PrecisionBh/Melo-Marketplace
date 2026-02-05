/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ---------------- ENV ----------------
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

if (!STRIPE_WEBHOOK_SECRET) throw new Error("Missing STRIPE_WEBHOOK_SECRET")
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL")
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

// ---------------- CLIENT ----------------
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

// ---------------- STRIPE SIGNATURE VERIFY ----------------
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
) {
  const encoder = new TextEncoder()

  const sigParts = signature.split(",")
  const timestamp = sigParts.find(p => p.startsWith("t="))?.split("=")[1]
  const v1 = sigParts.find(p => p.startsWith("v1="))?.split("=")[1]

  if (!timestamp || !v1) return false

  const signedPayload = `${timestamp}.${payload}`

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  )

  const signatureBytes = Uint8Array.from(
    v1.match(/.{2}/g)!.map(b => parseInt(b, 16))
  )

  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(signedPayload)
  )
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

  const body = await req.text()

  const valid = await verifyStripeSignature(
    body,
    signature,
    STRIPE_WEBHOOK_SECRET
  )

  if (!valid) {
    console.error("❌ Invalid Stripe signature")
    return new Response("Invalid signature", { status: 400 })
  }

  const event = JSON.parse(body)

  // ---------------- EVENT ----------------
  if (event.type === "checkout.session.completed") {
    const session = event.data.object

    const orderId = session.metadata?.order_id
    if (!orderId) {
      console.error("❌ Missing order_id in metadata")
      return new Response("Missing order_id", { status: 400 })
    }

    console.log("🔔 Stripe checkout completed:", orderId)

    const { data: existingOrder, error } = await supabase
      .from("orders")
      .select("id,status,listing_id,amount_cents")
      .eq("id", orderId)
      .single()

    if (error || !existingOrder) {
      console.error("❌ Order not found", error)
      return new Response("Order not found", { status: 404 })
    }

    // ---------------- IDEMPOTENCY ----------------
    if (existingOrder.status === "paid") {
      console.log("⚠️ Order already paid:", orderId)
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    // ---------------- AMOUNT VALIDATION ----------------
    if (
      typeof session.amount_total === "number" &&
      session.amount_total !== existingOrder.amount_cents
    ) {
      console.error(
        "❌ Amount mismatch",
        session.amount_total,
        existingOrder.amount_cents
      )
      return new Response("Amount mismatch", { status: 400 })
    }

    // ---------------- UPDATE ORDER ----------------
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),

        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent ?? null,

        escrow_status: "funded",
        escrow_funded_at: new Date().toISOString(),

        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (updateErr) {
      console.error("❌ Failed to update order", updateErr)
      return new Response("Order update failed", { status: 500 })
    }

    console.log("✅ Order PAID + escrow funded:", orderId)

    // ---------------- MARK LISTING SOLD ----------------
    if (existingOrder.listing_id) {
      const { error: listingErr } = await supabase
        .from("listings")
        .update({
          is_sold: true,
          status: "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingOrder.listing_id)

      if (listingErr) {
        console.error(
          "⚠️ Listing update failed (order still paid):",
          listingErr
        )
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
