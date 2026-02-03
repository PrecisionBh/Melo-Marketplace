/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno&no-check"

/* ---------------- ENV ---------------- */

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

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
    const { user_id, method } = await req.json()

    if (!user_id || !method) {
      return new Response("Missing parameters", { status: 400 })
    }

    if (!["ach", "instant"].includes(method)) {
      return new Response("Invalid payout method", { status: 400 })
    }

    /* -------- LOAD PROFILE -------- */

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", user_id)
        .single()

    if (profileError || !profile?.stripe_account_id) {
      return new Response("Stripe account not connected", {
        status: 400,
      })
    }

    const stripeAccountId = profile.stripe_account_id

    /* -------- LOAD WALLET -------- */

    const { data: wallet, error: walletError } =
      await supabase
        .from("wallets")
        .select("available_balance_cents, currency")
        .eq("user_id", user_id)
        .single()

    if (
      walletError ||
      !wallet ||
      wallet.available_balance_cents <= 0
    ) {
      return new Response("No available balance", {
        status: 400,
      })
    }

    const grossAmount = wallet.available_balance_cents / 100

    /* -------- FEE LOGIC (LOCKED) -------- */

    let fee = 0

    if (method === "instant") {
      const rawFee = grossAmount * 0.02
      fee = Math.min(25, +rawFee.toFixed(2))
    }

    const netAmount = +(grossAmount - fee).toFixed(2)

    if (netAmount <= 0) {
      return new Response("Invalid payout amount", {
        status: 400,
      })
    }

    /* -------- CREATE STRIPE PAYOUT -------- */

    const payout = await stripe.payouts.create(
      {
        amount: Math.round(netAmount * 100),
        currency: wallet.currency,
        method: method === "instant" ? "instant" : "standard",
      },
      {
        stripeAccount: stripeAccountId,
      }
    )

    /* -------- WRITE PAYOUT LEDGER -------- */

    const { error: payoutInsertError } =
      await supabase.from("payouts").insert({
        user_id,
        stripe_account_id: stripeAccountId,
        stripe_payout_id: payout.id,
        gross_amount_cents: Math.round(grossAmount * 100),
        fee_cents: Math.round(fee * 100),
        net_amount_cents: Math.round(netAmount * 100),
        method,
        status: payout.status,
        currency: wallet.currency,
      })

    if (payoutInsertError) {
      console.error("Payout ledger insert failed:", payoutInsertError)
      throw new Error("Payout ledger write failed")
    }

    /* -------- ZERO WALLET BALANCE -------- */

    const { error: walletUpdateError } =
      await supabase
        .from("wallets")
        .update({
          available_balance_cents: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user_id)

    if (walletUpdateError) {
      console.error("Wallet update failed:", walletUpdateError)
      throw new Error("Wallet update failed")
    }

    /* -------- SUCCESS -------- */

    return new Response(
      JSON.stringify({
        success: true,
        payout_id: payout.id,
        method,
        gross_amount: grossAmount,
        fee,
        net_amount: netAmount,
        status: payout.status,
      }),
      { status: 200 }
    )
  } catch (err: any) {
    console.error("Create payout error:", err)

    return new Response(
      JSON.stringify({
        error: err.message ?? "Payout failed",
      }),
      { status: 500 }
    )
  }
})
