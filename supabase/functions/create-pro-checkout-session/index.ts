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

    // ✅ Deep links back into Expo app (MATCHES your existing pattern)
    const successUrl = `melomp://pro/success?user_id=${user_id}`
    const cancelUrl = `melomp://pro/cancel`

    const session = await stripe.checkout.sessions.create({
      mode: "subscription", // ⭐ THIS is the ONLY major change
      payment_method_types: ["card"],
      customer_email: email,

      line_items: [
        {
          price: MELO_PRO_PRICE_ID, // 🔥 subscription uses PRICE not price_data
          quantity: 1,
        },
      ],

      metadata: {
        user_id,
        type: "melo_pro_subscription",
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