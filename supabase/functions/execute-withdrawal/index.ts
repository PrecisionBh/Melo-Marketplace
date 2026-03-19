/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

console.log("🚀 execute-withdrawal function booted")

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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
const FEE_MIN = 75 // $0.75
const FEE_CAP = 2500 // $25.00

Deno.serve(async (req) => {
  // ✅ CORS preflight
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
    console.error("❌ Invalid JSON body")
    return new Response("Invalid JSON body", { status: 400, headers: corsHeaders })
  }

  const { user_id, amount_cents, payout_type } = body

  console.log("📥 Payload", { user_id, amount_cents, payout_type })

  if (!user_id || !amount_cents || !payout_type) {
    console.error("❌ Missing parameters")
    return new Response("Missing parameters", { status: 400, headers: corsHeaders })
  }

  if (payout_type !== "instant" && payout_type !== "standard") {
    console.error("❌ Invalid payout_type")
    return new Response("Invalid payout_type", { status: 400, headers: corsHeaders })
  }

  /* ---------- Load wallet ---------- */
  console.log("🔍 Loading wallet")

  const { data: wallet, error: walletErr } = await supabase
    .from("wallets")
    .select("id, available_balance_cents, payout_locked")
    .eq("user_id", user_id)
    .single()

  if (walletErr || !wallet) {
    console.error("❌ Wallet not found", walletErr)
    return new Response("Wallet not found", { status: 404, headers: corsHeaders })
  }

  console.log("💼 Wallet loaded", {
    wallet_id: wallet.id,
    available_balance_cents: wallet.available_balance_cents,
    payout_locked: wallet.payout_locked,
  })

  if (wallet.payout_locked) {
    console.error("⛔ Wallet is locked")
    return new Response("Wallet locked", { status: 409, headers: corsHeaders })
  }

  if (amount_cents > wallet.available_balance_cents) {
    console.error("⛔ Insufficient funds", {
      requested: amount_cents,
      available: wallet.available_balance_cents,
    })
    return new Response("Insufficient funds", { status: 400, headers: corsHeaders })
  }

  /* ---------- Lock wallet ---------- */
  console.log("🔒 Locking wallet")

  const { error: lockErr } = await supabase
    .from("wallets")
    .update({ payout_locked: true })
    .eq("id", wallet.id)

  if (lockErr) {
    console.error("❌ Failed to lock wallet", lockErr)
    return new Response("Failed to lock wallet", { status: 500, headers: corsHeaders })
  }

  // We will unlock in finally/catch.
  let createdStripePayoutId: string | null = null

  try {
    /* ---------- Stripe account ---------- */
    console.log("🔍 Loading Stripe account")

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user_id)
      .single()

    if (profileErr || !profile?.stripe_account_id) {
      console.error("❌ Stripe account missing", profileErr)
      throw new Error("Stripe account missing")
    }

    console.log("🔗 Stripe account found", profile.stripe_account_id)

    /* ---------- Fee calculation ---------- */
    let fee_cents = 0
    if (payout_type === "instant") {
      fee_cents = Math.min(
        Math.max(Math.round(amount_cents * FEE_RATE), FEE_MIN),
        FEE_CAP
      )
    }

    const net_cents = amount_cents - fee_cents

    console.log("🧮 Fee calculation", {
      gross: amount_cents,
      fee_cents,
      net_cents,
      payout_type,
    })

    /* ---------- Collect instant fee via transfer ---------- */
    if (payout_type === "instant" && fee_cents > 0) {
      const platformAccountId = Deno.env.get("STRIPE_PLATFORM_ACCOUNT_ID")
      if (!platformAccountId) {
        console.error("❌ Missing STRIPE_PLATFORM_ACCOUNT_ID env var")
        throw new Error("Missing STRIPE_PLATFORM_ACCOUNT_ID")
      }

      console.log("🏦 Collecting instant fee via transfer", {
        fee_cents,
        platformAccountId,
      })

      await stripe.transfers.create(
        {
          amount: fee_cents,
          currency: "usd",
          destination: platformAccountId,
          metadata: {
            user_id,
            gross_amount_cents: amount_cents.toString(),
            fee_cents: fee_cents.toString(),
            fee_type: "instant_payout_fee",
          },
        },
        { stripeAccount: profile.stripe_account_id }
      )

      console.log("✅ Instant fee transferred to platform")
    }

    /* ---------- Stripe payout ---------- */
    console.log("💸 Creating Stripe payout")

    const payout = await stripe.payouts.create(
      {
        amount: net_cents,
        currency: "usd",
        method: payout_type === "instant" ? "instant" : "standard",
        metadata: {
          user_id,
          gross_amount_cents: amount_cents.toString(),
          fee_cents: fee_cents.toString(),
        },
      },
      { stripeAccount: profile.stripe_account_id }
    )

    createdStripePayoutId = payout.id

    console.log("✅ Stripe payout created", {
      payout_id: payout.id,
      status: payout.status,
    })

    /* ---------- Record payout (MUST SUCCEED) ---------- */
    console.log("📝 Recording payout in DB")

    const { error: payoutInsertErr } = await supabase.from("payouts").upsert(
      {
        user_id,
        wallet_id: wallet.id,
        amount_cents,
        fee_cents,
        net_cents,
        method: payout_type, // "instant" | "standard"
        stripe_payout_id: payout.id,
        status: payout.status ?? "pending",
      },
      {
        // ✅ prevents duplicates if function is re-tried
        onConflict: "stripe_payout_id",
      }
    )

    if (payoutInsertErr) {
      console.error("❌ Failed to record payout row", payoutInsertErr)
      // Stripe payout already created; we STILL must surface failure so you can fix immediately.
      throw new Error("Failed to record payout row")
    }

    console.log("✅ Payout row recorded")

    /* ---------- Record wallet transaction ---------- */
    console.log("🧾 Recording wallet transaction")

    const walletTransactionType =
      payout_type === "instant" ? "payout_instant" : "payout_standard"

    const { error: txErr } = await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      user_id,
      type: walletTransactionType,
      direction: "debit",
      amount_cents,
      status: "completed",
      description: "Seller withdrawal",
    })

    if (txErr) {
      // Non-blocking, but we WANT to see it
      console.error("⚠️ Wallet transaction log failed (non-blocking)", txErr)
    }

    /* ---------- Update wallet balance (gross leaves available balance) ---------- */
    console.log("📉 Updating wallet balance")

    const { error: walletUpdateErr } = await supabase
      .from("wallets")
      .update({
        available_balance_cents: wallet.available_balance_cents - amount_cents,
        payout_locked: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)

    if (walletUpdateErr) {
      console.error("❌ Wallet update failed AFTER payout", walletUpdateErr)
      // payout row exists; wallet update failed needs immediate visibility
      throw new Error("Wallet update failed")
    }

    console.log("✅ Wallet updated")

    /* ---------- Create notification ---------- */
    console.log("🔔 Creating withdrawal notification")

    const { error: notificationErr } = await supabase
  .from("notifications")
  .insert({
    user_id,
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
  })

    if (notificationErr) {
      console.error("⚠️ Notification insert failed", notificationErr)
    }

    console.log("🏁 Withdrawal completed successfully")

    return new Response(
      JSON.stringify({
        success: true,
        payout_id: payout.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("🔥 Withdrawal failed", err)

    // Always unlock wallet on failure
    console.log("🔓 Unlocking wallet after failure")

    const { error: unlockErr } = await supabase
      .from("wallets")
      .update({ payout_locked: false })
      .eq("id", wallet.id)

    if (unlockErr) {
      console.error("❌ Failed to unlock wallet", unlockErr)
    }

    // If Stripe payout succeeded but we failed after, return the payout id to help debugging
    return new Response(
      JSON.stringify({
        error: "Withdrawal failed",
        stripe_payout_id: createdStripePayoutId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})