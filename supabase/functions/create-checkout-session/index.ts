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
    const { order_id, amount, email } = body

    if (!order_id || !amount || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      )
    }

    // ✅ Deep links back into Expo app
    const successUrl = `melomp://checkout/success?order_id=${order_id}`
    const cancelUrl = `melomp://checkout/success?order_id=${order_id}`


    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Melo Marketplace Purchase",
            },
            unit_amount: amount, // cents
          },
          quantity: 1,
        },
      ],

      metadata: {
        order_id,
      },

      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: any) {
    console.error("❌ create-checkout-session error:", err)
    return new Response(
      JSON.stringify({ error: err?.message ?? "Checkout failed" }),
      { status: 400 }
    )
  }
})
