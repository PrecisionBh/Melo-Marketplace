/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

/* ---------- ENV ---------- */

const STRIPE_SECRET_KEY =
  Deno.env.get("STRIPE_SECRET_KEY")

if (!STRIPE_SECRET_KEY) {
  throw new Error(
    "Missing STRIPE_SECRET_KEY"
  )
}

/* ---------- CLIENT ---------- */

const stripe = new Stripe(
  STRIPE_SECRET_KEY,
  {
    apiVersion: "2023-10-16",
  }
)

/* ---------- HANDLER ---------- */

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Method not allowed",
        }),
        { status: 405 }
      )
    }

    const body = await req.json()

    const {
      order_ids,
      amount,
      email,
    } = body

    if (
      !order_ids ||
      !Array.isArray(order_ids) ||
      order_ids.length === 0 ||
      !amount ||
      !email
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields",
        }),
        { status: 400 }
      )
    }

    const successUrl =
      "melomp://cart/cart-success"

    const cancelUrl =
      "melomp://cart/cart-cancel"

    const session =
      await stripe.checkout.sessions.create(
        {
          mode: "payment",

          payment_method_types: [
            "card",
          ],

          customer_email: email,

          line_items: [
            {
              price_data: {
                currency: "usd",

                product_data: {
                  name: `Melo Cart Purchase (${order_ids.length} item${
                    order_ids.length === 1
                      ? ""
                      : "s"
                  })`,
                },

                unit_amount: amount,
              },

              quantity: 1,
            },
          ],

          metadata: {
            order_ids:
              JSON.stringify(
                order_ids
              ),
          },

          payment_intent_data: {
            metadata: {
              order_ids:
                JSON.stringify(
                  order_ids
                ),
            },
          },

          success_url:
            successUrl,

          cancel_url:
            cancelUrl,
        }
      )

    return new Response(
      JSON.stringify({
        url: session.url,
      }),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    )
  } catch (err: any) {
    console.error(
      "❌ create-cart-checkout-session error:",
      err
    )

    return new Response(
      JSON.stringify({
        error:
          err?.message ??
          "Checkout failed",
      }),
      { status: 400 }
    )
  }
})