/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno&no-check"

/* ---------------- ENV ---------------- */

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required environment variables")
}

/* ---------------- CLIENTS ---------------- */

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

/* ---------------- HANDLER ---------------- */

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    /* ---------------- AUTH ---------------- */

    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401 })
    }

    const jwt = authHeader.replace("Bearer ", "")

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt)

    if (authError || !user) {
      return new Response("Unauthorized", { status: 401 })
    }

    const user_id = user.id
    const email = user.email

    if (!email) {
      return new Response("User email not found", { status: 400 })
    }

    /* ---------------- LOAD PROFILE ---------------- */

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", user_id)
        .single()

    if (profileError) {
      throw profileError
    }

    let stripeAccountId = profile?.stripe_account_id

    /* ---------------- CREATE STRIPE ACCOUNT ---------------- */

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: "individual",
      })

      stripeAccountId = account.id

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ stripe_account_id: stripeAccountId })
        .eq("id", user_id)

      if (updateError) {
        throw updateError
      }
    }

    /* ---------------- ACCOUNT LINK ---------------- */

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: "account_onboarding",
      refresh_url: "https://melomarketplace.app/payouts",
      return_url: "https://melomarketplace.app/payouts",
    })

    return new Response(
      JSON.stringify({ url: accountLink.url }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  } catch (err: any) {
    console.error("create-connect-account-link error:", err)

    return new Response(
      JSON.stringify({
        error: err.message ?? "Failed to create account link",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  }
})
