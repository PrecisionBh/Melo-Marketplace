/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing env vars")
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

serve(
  async (req) => {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 })
    }

    try {
      const { user_id, email } = await req.json()

      if (!user_id || !email) {
        return new Response(
          JSON.stringify({ error: "Missing user_id or email" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      }

      // 1️⃣ Fetch profile from DB (SOURCE OF TRUTH)
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", user_id)
        .single()

      if (error) throw error

      let stripeAccountId = profile?.stripe_account_id

      // 2️⃣ Create account ONLY if none exists
      if (!stripeAccountId) {
        const account = await stripe.accounts.create({
          type: "express",
          email,
        })

        stripeAccountId = account.id

        // 3️⃣ Persist immediately
        await supabase
          .from("profiles")
          .update({ stripe_account_id: stripeAccountId })
          .eq("id", user_id)
      }

      // 4️⃣ Create onboarding link (safe to repeat)
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: "https://melomp-redirect.vercel.app/?result=refresh",
        return_url: "https://melomp-redirect.vercel.app/?result=success",
        type: "account_onboarding",
      })

      return new Response(
        JSON.stringify({
          url: accountLink.url,
          stripe_account_id: stripeAccountId,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }
  },
  { verifyJwt: false }
)
