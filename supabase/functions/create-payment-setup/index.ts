/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")

console.log("🔐 STRIPE_SECRET_KEY exists:", !!STRIPE_SECRET_KEY)

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" })
  : null

serve(async (req) => {
  console.log("➡️ Incoming request:", req.method)

  try {
    if (!stripe) {
      console.error("❌ Stripe not configured")
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500 }
      )
    }

    let body
    try {
      body = await req.json()
    } catch (e) {
      console.error("❌ Invalid JSON body")
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400 }
      )
    }

    console.log("📦 Request body:", body)

    const { user_id, email } = body

    if (!email) {
      console.error("❌ Missing email")
      return new Response(
        JSON.stringify({ error: "Missing email" }),
        { status: 400 }
      )
    }

    console.log("💳 Creating Stripe Setup Session")

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer_email: email,
      payment_method_types: ["card"],
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
    })

    console.log("✅ Stripe session created:", session.url)

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (err) {
    console.error("🔥 FUNCTION ERROR:", err)

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    )
  }
})
