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
    const {
      listing_id,
      amount,
      customer_id,
      seller_stripe_account_id,
    } = await req.json()

    if (!listing_id || !amount || !customer_id || !seller_stripe_account_id) {
      return new Response(
        JSON.stringify({
          error:
            "Missing listing_id, amount, customer_id, or seller_stripe_account_id",
        }),
        { status: 400 }
      )
    }

    // 🔍 Fetch customer to get default payment method
    const customer = await stripe.customers.retrieve(customer_id)

    const defaultPaymentMethod =
      (customer as any).invoice_settings?.default_payment_method

    if (!defaultPaymentMethod) {
      return new Response(
        JSON.stringify({
          error: "No default payment method",
          code: "NO_DEFAULT_PAYMENT_METHOD",
        }),
        { status: 400 }
      )
    }

    // 💳 DESTINATION CHARGE (THIS IS THE FIX)
    const intent = await stripe.paymentIntents.create({
      amount, // cents
      currency: "usd",
      customer: customer_id,
      payment_method: defaultPaymentMethod,
      confirm: true,
      off_session: true,

      // 🔥 ROUTES FUNDS TO CONNECTED ACCOUNT
      transfer_data: {
        destination: seller_stripe_account_id,
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
      JSON.stringify({
        error: err.message,
        code: err.code,
      }),
      { status: 500 }
    )
  }
})
