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

/* ---------------- FEE RULES ---------------- */

const FEE_RATE = 0.03
const FEE_MIN = 75     // $0.75
const FEE_CAP = 2500   // $25.00

Deno.serve(async (req) => {
  console.log("➡️ Incoming withdrawal request")

  let body
  try {
    body = await req.json()
  } catch {
    console.error("❌ Invalid JSON body")
    return new Response("Invalid JSON body", { status: 400 })
  }

  const { user_id, amount_cents, payout_type } = body

  console.log("📥 Payload", { user_id, amount_cents, payout_type })

  if (!user_id || !amount_cents || !payout_type) {
    console.error("❌ Missing parameters")
    return new Response("Missing parameters", { status: 400 })
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
    return new Response("Wallet not found", { status: 404 })
  }

  console.log("💼 Wallet loaded", {
    wallet_id: wallet.id,
    available_balance_cents: wallet.available_balance_cents,
    payout_locked: wallet.payout_locked,
  })

  if (wallet.payout_locked) {
    console.error("⛔ Wallet is locked")
    return new Response("Wallet locked", { status: 409 })
  }

  if (amount_cents > wallet.available_balance_cents) {
    console.error("⛔ Insufficient funds", {
      requested: amount_cents,
      available: wallet.available_balance_cents,
    })
    return new Response("Insufficient funds", { status: 400 })
  }

  /* ---------- Lock wallet ---------- */
  console.log("🔒 Locking wallet")

  await supabase
    .from("wallets")
    .update({ payout_locked: true })
    .eq("id", wallet.id)

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

    /* =====================================================
       ✅ ADDITION: TAKE INSTANT FEE AT PAYOUT TIME (MERCARI STYLE)
       - Transfer fee from connected account → platform account
       - Then payout net_cents
       ===================================================== */
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
    /* ===================================================== */

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

    console.log("✅ Stripe payout created", {
      payout_id: payout.id,
      status: payout.status,
    })

    /* ---------- Update wallet ---------- */
    console.log("📉 Updating wallet balance")

    await supabase
      .from("wallets")
      .update({
        available_balance_cents:
          wallet.available_balance_cents - amount_cents,
        payout_locked: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)

    console.log("✅ Wallet updated")

    /* ---------- Record payout ---------- */
    console.log("📝 Recording payout")

    await supabase.from("payouts").insert({
      user_id,
      wallet_id: wallet.id,
      amount_cents,
      fee_cents,
      net_cents,
      method: payout_type,
      stripe_payout_id: payout.id,
      status: payout.status,
    })

    /* ---------- Record wallet transaction (MVP withdrawal tracking) ---------- */
    try {
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        user_id,
        type: "withdrawal",
        direction: "debit",
        amount_cents,
        status: "completed",
        description: "Seller withdrawal",
      })
    } catch (logErr) {
      console.error("⚠️ Wallet transaction log failed (non-blocking)", logErr)
    }

    console.log("🏁 Withdrawal completed successfully")

    return Response.json({
      success: true,
      payout_id: payout.id,
    })
  } catch (err) {
    console.error("🔥 Withdrawal failed", err)

    console.log("🔓 Unlocking wallet after failure")

    await supabase
      .from("wallets")
      .update({ payout_locked: false })
      .eq("id", wallet.id)

    return new Response("Withdrawal failed", { status: 500 })
  }
})
