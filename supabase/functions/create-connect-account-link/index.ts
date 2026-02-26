/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

console.log("🔐 ENV CHECK:", {
  hasStripeKey: !!STRIPE_SECRET_KEY,
  hasSupabaseUrl: !!SUPABASE_URL,
  hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
})

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
    console.log("📥 FUNCTION HIT:", {
      method: req.method,
      url: req.url,
    })

    if (req.method !== "POST") {
      console.log("❌ INVALID METHOD:", req.method)
      return new Response("Method Not Allowed", { status: 405 })
    }

    try {
      const body = await req.json()
      console.log("📦 REQUEST BODY:", body)

      const { user_id, email } = body

      console.log("🧾 PARSED INPUT:", {
        user_id,
        email,
        hasUserId: !!user_id,
        hasEmail: !!email,
      })

      if (!user_id || !email) {
        console.log("❌ MISSING REQUIRED FIELDS")
        return new Response(
          JSON.stringify({ error: "Missing user_id or email" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      }

      // 1️⃣ Fetch profile from DB (SOURCE OF TRUTH)
      console.log("🔎 FETCHING PROFILE FOR USER:", user_id)

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", user_id)
        .single()

      console.log("👤 PROFILE QUERY RESULT:", {
        profile,
        error,
      })

      if (error) {
        console.error("❌ PROFILE FETCH ERROR:", error)
        throw error
      }

      let stripeAccountId = profile?.stripe_account_id

      console.log("🏦 EXISTING STRIPE ACCOUNT:", stripeAccountId)

      // 2️⃣ Create account ONLY if none exists
      if (!stripeAccountId) {
        console.log("🆕 CREATING NEW STRIPE EXPRESS ACCOUNT FOR:", email)

        const account = await stripe.accounts.create({
          type: "express",
          email,

          // ✅ CRITICAL: Prevent Stripe auto-payouts. Withdrawals are app-controlled.
          settings: {
            payouts: {
              schedule: {
                interval: "manual",
              },
            },
          },
        })

        console.log("✅ STRIPE ACCOUNT CREATED:", account.id)

        stripeAccountId = account.id

        // 3️⃣ Persist immediately
        console.log("💾 SAVING STRIPE ACCOUNT ID TO PROFILE")

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ stripe_account_id: stripeAccountId })
          .eq("id", user_id)

        if (updateError) {
          console.error("❌ PROFILE UPDATE ERROR:", updateError)
          throw updateError
        }

        console.log("✅ PROFILE UPDATED WITH STRIPE ACCOUNT ID")
      } else {
        console.log("♻️ REUSING EXISTING STRIPE ACCOUNT:", stripeAccountId)
      }

      // 4️⃣ Create onboarding link (safe to repeat)
      console.log("🔗 CREATING STRIPE ONBOARDING LINK")

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        return_url: "https://melomp-redirect.vercel.app",
        refresh_url: "https://melomp-redirect.vercel.app",
        type: "account_onboarding",
      })

      console.log("🎉 ONBOARDING LINK CREATED:", accountLink.url)

      return new Response(
        JSON.stringify({
          url: accountLink.url,
          stripe_account_id: stripeAccountId,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    } catch (err: any) {
      console.error("💥 FUNCTION CRASH:", {
        message: err?.message,
        stack: err?.stack,
        raw: err,
      })

      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }
  },
  { verifyJwt: false }
)