/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

// ---------- ENV ----------
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")

if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY")
}

// ---------- CLIENT ----------
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
})

// 🔥 YOUR REAL MELO PRO PRICE ID
const MELO_PRO_PRICE_ID = "price_1T41qIDrYUL6FG4RqeWVnaQn"

// ---------- HANDLER ----------
serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405 }
      )
    }

    const body = await req.json()
    const { user_id, email } = body

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      )
    }

    // 🧠 STEP 1: Find existing Stripe Customer by email (prevents duplicates)
    let customerId: string | null = null

    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id
    } else {
      // 🆕 Create new Stripe Customer linked to Melo user
      const customer = await stripe.customers.create({
        email,
        metadata: {
          user_id,
          app: "melo",
        },
      })
      customerId = customer.id
    }

    // ✅ Deep links back into Expo app (UNCHANGED)
    const successUrl = `melomp://pro/success?user_id=${user_id}`
    const cancelUrl = `melomp://pro/cancel`

    // 🚀 STEP 2: Create subscription checkout session WITH customer ID
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId, // 🔥 CRITICAL FIX (NOT customer_email anymore)

      payment_method_types: ["card"],

      line_items: [
        {
          price: MELO_PRO_PRICE_ID,
          quantity: 1,
        },
      ],

      metadata: {
        user_id,
        type: "melo_pro_subscription",
        customer_id: customerId, // helps webhook later
      },

      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: any) {
    console.error("❌ create-pro-checkout-session error:", err)
    return new Response(
      JSON.stringify({ error: err?.message ?? "Checkout failed" }),
      { status: 400 }
    )
  }
})