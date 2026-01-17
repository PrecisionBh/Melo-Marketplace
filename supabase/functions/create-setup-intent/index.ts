/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno&no-check"

// 🔐 Load Stripe secret key
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")

console.log("🚀 create-setup-intent booting")
console.log("🔐 STRIPE_SECRET_KEY exists:", !!STRIPE_SECRET_KEY)

if (!STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY is MISSING")
  throw new Error("STRIPE_SECRET_KEY is missing")
}

// ✅ Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
})

serve(async (req: Request) => {
  console.log("➡️ Incoming request:", req.method)

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  try {
    const body = await req.json()
    console.log("📦 Request body:", body)

    const { user_id, email, stripe_customer_id } = body

    if (!user_id || !email) {
      console.error("❌ Missing user_id or email")
      return new Response(
        JSON.stringify({ error: "Missing user_id or email" }),
        { status: 400 }
      )
    }

    let customerId = stripe_customer_id

    // 👤 Create customer if missing
    if (!customerId) {
      console.log("👤 Creating Stripe customer")
      const customer = await stripe.customers.create({
        email,
        metadata: { user_id },
      })
      customerId = customer.id
      console.log("✅ Customer created:", customerId)
    } else {
      console.log("♻️ Reusing customer:", customerId)
    }

    // 🔑 Create Ephemeral Key (REQUIRED for manual-entry PaymentSheet)
    console.log("🔑 Creating ephemeral key")
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2023-10-16" }
    )

    // 💳 Create SetupIntent (save card, no charge)
    console.log("💳 Creating SetupIntent")
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
    })

    console.log("✅ SetupIntent created")

    return new Response(
      JSON.stringify({
        customerId,
        ephemeralKey: ephemeralKey.secret,
        setupIntentClientSecret: setupIntent.client_secret,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (err) {
    console.error("❌ create-setup-intent error:", err)

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 }
    )
  }
})
