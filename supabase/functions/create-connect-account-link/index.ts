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

if (
  !STRIPE_SECRET_KEY ||
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY
) {
  throw new Error("Missing env vars")
}

const stripe = new Stripe(
  STRIPE_SECRET_KEY,
  {
    apiVersion: "2023-10-16",
  }
)

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
      return new Response(
        "Method Not Allowed",
        { status: 405 }
      )
    }

    try {
      const body =
        await req.json()

      console.log(
        "📦 REQUEST BODY:",
        body
      )

      const {
        user_id,
        email,
      } = body

      if (
        !user_id ||
        !email
      ) {
        return new Response(
          JSON.stringify({
            error:
              "Missing user_id or email",
          }),
          {
            status: 400,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        )
      }

      // Fetch profile

      const {
        data: profile,
        error,
      } = await supabase
        .from("profiles")
        .select(
          "stripe_account_id"
        )
        .eq(
          "id",
          user_id
        )
        .single()

      if (error) throw error

      let stripeAccountId =
        profile?.stripe_account_id

      let account: any

      console.log(
        "🏦 EXISTING ACCOUNT:",
        stripeAccountId
      )

      // Create account if needed

      if (!stripeAccountId) {
        console.log(
          "🆕 CREATING STRIPE ACCOUNT"
        )

        account =
          await stripe.accounts.create(
            {
              type: "express",

              email,

              capabilities: {
                card_payments: {
                  requested: true,
                },

                transfers: {
                  requested: true,
                },
              },

              settings: {
                payouts: {
                  schedule: {
                    interval:
                      "manual",
                  },
                },
              },
            }
          )

        stripeAccountId =
          account.id

        await supabase
          .from("profiles")
          .update({
            stripe_account_id:
              stripeAccountId,
          })
          .eq(
            "id",
            user_id
          )

        console.log(
          "✅ ACCOUNT CREATED:",
          stripeAccountId
        )
      } else {
        console.log(
          "♻️ USING EXISTING ACCOUNT"
        )

        account =
          await stripe.accounts.retrieve(
            stripeAccountId
          )
      }

      // Refresh account data

      account =
        await stripe.accounts.retrieve(
          stripeAccountId
        )

      const onboardingComplete =
        account.details_submitted &&
        account.charges_enabled &&
        account.payouts_enabled

      console.log(
        "📊 ACCOUNT STATUS",
        {
          details_submitted:
            account.details_submitted,

          charges_enabled:
            account.charges_enabled,

          payouts_enabled:
            account.payouts_enabled,

          onboardingComplete,
        }
      )

      // Save Stripe status to profile

      // Save Stripe status to profile

await supabase
  .from("profiles")
  .update({
    stripe_onboarded:
      account.details_submitted,

    stripe_onboarding_complete:
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled,
  })
  .eq(
    "id",
    user_id
  )

      // Generate onboarding link

      const accountLink =
        await stripe.accountLinks.create(
          {
            account:
              stripeAccountId,

            return_url:
              "https://melomp-redirect.vercel.app",

            refresh_url:
              "https://melomp-redirect.vercel.app",

            type:
              "account_onboarding",
          }
        )

      console.log(
        "🎉 ACCOUNT LINK CREATED"
      )

      return new Response(
        JSON.stringify({
          url:
            accountLink.url,

          stripe_account_id:
            stripeAccountId,

          onboarding_complete:
            onboardingComplete,

          details_submitted:
            account.details_submitted,

          charges_enabled:
            account.charges_enabled,

          payouts_enabled:
            account.payouts_enabled,
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
        "💥 FUNCTION CRASH:",
        err
      )

      return new Response(
        JSON.stringify({
          error:
            err.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      )
    }
  },
  {
    verifyJwt: false,
  }
)