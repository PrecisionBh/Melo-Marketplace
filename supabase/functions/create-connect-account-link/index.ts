/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY")
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
})

serve(
  async (req) => {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 })
    }

    try {
      const { email, stripe_account_id } = await req.json()

      if (!email) {
        return new Response(
          JSON.stringify({ error: "Missing email" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        )
      }

      // 1️⃣ Create Stripe Express account if one doesn't exist
      const accountId =
        stripe_account_id ??
        (await stripe.accounts.create({
          type: "express",
          email,
        })).id

      // 2️⃣ Create Stripe onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: "https://melomp-redirect.vercel.app/?result=refresh",
        return_url: "https://melomp-redirect.vercel.app/?result=success",
        type: "account_onboarding",
      })

      // 3️⃣ Return JSON with proper headers (CRITICAL)
      return new Response(
        JSON.stringify({
          url: accountLink.url,
          stripe_account_id: accountId,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err.message }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    }
  },

  // 🚫 DISABLE JWT VERIFICATION
  { verifyJwt: false }
)
