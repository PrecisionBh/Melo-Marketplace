/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

console.log("🚀 execute-withdrawal function booted")

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

/* ---------------- CORS ---------------- */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

/* ---------------- FEE RULES ---------------- */

const FEE_RATE = 0.03
const FEE_MIN = 75
const FEE_CAP = 2500

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    })
  }

  console.log("➡️ Incoming withdrawal request")

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response("Invalid JSON body", { status: 400, headers: corsHeaders })
  }

  const { user_id, amount_cents, payout_type } = body

  if (!user_id || !amount_cents || !payout_type) {
    return new Response("Missing parameters", { status: 400, headers: corsHeaders })
  }

  if (payout_type !== "instant" && payout_type !== "standard") {
    return new Response("Invalid payout_type", { status: 400, headers: corsHeaders })
  }

  const { data: wallet, error: walletErr } = await supabase
    .from("wallets")
    .select("id, available_balance_cents, payout_locked")
    .eq("user_id", user_id)
    .single()

  if (walletErr || !wallet) {
    return new Response("Wallet not found", { status: 404, headers: corsHeaders })
  }

  if (wallet.payout_locked) {
    return new Response("Wallet locked", { status: 409, headers: corsHeaders })
  }

  if (amount_cents > wallet.available_balance_cents) {
    return new Response("Insufficient funds", { status: 400, headers: corsHeaders })
  }

  const { error: lockErr } = await supabase
    .from("wallets")
    .update({ payout_locked: true })
    .eq("id", wallet.id)

  if (lockErr) {
    return new Response("Failed to lock wallet", { status: 500, headers: corsHeaders })
  }

  let createdStripePayoutId: string | null = null

  try {
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user_id)
      .single()

    if (profileErr || !profile?.stripe_account_id) {
      throw new Error("Stripe account missing")
    }

    let fee_cents = 0
    if (payout_type === "instant") {
      fee_cents = Math.min(
        Math.max(Math.round(amount_cents * FEE_RATE), FEE_MIN),
        FEE_CAP
      )
    }

    const net_cents = amount_cents - fee_cents

    if (payout_type === "instant" && fee_cents > 0) {
      const platformAccountId = Deno.env.get("STRIPE_PLATFORM_ACCOUNT_ID")!
      await stripe.transfers.create(
        {
          amount: fee_cents,
          currency: "usd",
          destination: platformAccountId,
        },
        { stripeAccount: profile.stripe_account_id }
      )
    }

    const payout = await stripe.payouts.create(
      {
        amount: net_cents,
        currency: "usd",
        method: payout_type === "instant" ? "instant" : "standard",
      },
      { stripeAccount: profile.stripe_account_id }
    )

    createdStripePayoutId = payout.id

    await supabase.from("payouts").upsert(
      {
        user_id,
        wallet_id: wallet.id,
        amount_cents,
        fee_cents,
        net_cents,
        method: payout_type,
        stripe_payout_id: payout.id,
        status: payout.status ?? "pending",
      },
      { onConflict: "stripe_payout_id" }
    )

    await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      user_id,
      type: payout_type === "instant" ? "payout_instant" : "payout_standard",
      direction: "debit",
      amount_cents,
      status: "completed",
      description: "Seller withdrawal",
    })

    await supabase
      .from("wallets")
      .update({
        available_balance_cents: wallet.available_balance_cents - amount_cents,
        payout_locked: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)

    /* ---------------- NOTIFICATIONS (FIXED) ---------------- */
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          userId: user_id,
          type: "withdrawal",
          title: "Withdrawal Sent",
          body: `Your payout of $${(net_cents / 100).toFixed(2)} has been sent to your bank account.`,
          data: {
            payout_id: payout.id,
            amount_cents,
            fee_cents,
            net_cents,
            payout_type,
          },
          dedupeKey: `withdrawal-${payout.id}`,
        }),
      })
    } catch (err) {
      console.log("⚠️ Withdrawal notification failed:", err)
    }

    return new Response(
      JSON.stringify({
        success: true,
        payout_id: payout.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    await supabase
      .from("wallets")
      .update({ payout_locked: false })
      .eq("id", wallet.id)

    return new Response(
      JSON.stringify({
        error: "Withdrawal failed",
        stripe_payout_id: createdStripePayoutId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})