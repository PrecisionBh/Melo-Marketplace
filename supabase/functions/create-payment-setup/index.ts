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
    const { user_id, email } = await req.json()

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or email" }),
        { status: 400 }
      )
    }

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      payment_method_types: ["card"],
      customer_email: email,

      // ✅ REDIRECT THROUGH HTTPS → BACK TO APP
      success_url: "https://melomp-redirect.vercel.app/?result=success",
      cancel_url: "https://melomp-redirect.vercel.app/?result=cancel",

      metadata: {
        user_id,
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    )
  }
})
