/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

// ---------- ENV ----------
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY")
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL")
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

// ---------- CLIENTS ----------
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

// ---------- HANDLER ----------
serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 })
    }

    const {
      listing_id,
      amount,
      email,
      buyer_id,
      seller_id,
    } = await req.json()

    if (!listing_id || !amount || !email || !buyer_id || !seller_id) {
      return new Response(
        JSON.stringify({
          error:
            "Missing listing_id, amount, email, buyer_id, or seller_id",
        }),
        { status: 400 }
      )
    }

    // ---------- CREATE ORDER FIRST ----------
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id,
        seller_id,
        listing_id,
        status: "pending_payment",
        amount_cents: amount,
        currency: "usd",
        listing_snapshot: {},
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error("Order creation failed:", orderError)
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500 }
      )
    }

    const orderId = order.id

    // ---------- CREATE STRIPE CHECKOUT ----------
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,

      // Collect shipping + phone
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      phone_number_collection: {
        enabled: true,
      },

      // Save card for future use
      payment_intent_data: {
        setup_future_usage: "off_session",
      },

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Marketplace Purchase",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],

      metadata: {
        order_id: orderId,
        listing_id,
        buyer_id,
        seller_id,
      },

      success_url: "melomp://checkout/success",
      cancel_url: "melomp://checkout/cancel",
    })

    return new Response(
      JSON.stringify({ url: session.url, order_id: orderId }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (err: any) {
    console.error("Checkout error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
    })
  }
})
