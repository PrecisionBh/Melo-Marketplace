/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY")

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
})

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  try {
    const { listing_id, amount, customer_id } = await req.json()

    if (!amount || !customer_id || !listing_id) {
      return new Response(
        JSON.stringify({
          error: "Missing listing_id, amount, or customer_id",
        }),
        { status: 400 }
      )
    }

    const intent = await stripe.paymentIntents.create({
      amount, // already in cents
      currency: "usd",
      customer: customer_id,

      // 🔑 REQUIRED for default saved card
      payment_method: "pm_card_visa", // placeholder fallback
      off_session: true,
      confirm: true,

      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },

      metadata: {
        listing_id,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id: intent.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (err: any) {
    console.error("Quick buy error:", err)

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    )
  }
})
