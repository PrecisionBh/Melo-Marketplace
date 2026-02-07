/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

console.log("🚀 execute-stripe-payout function booted")

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

Deno.serve(async (req) => {
  console.log("📥 Incoming payout request")

  let body: any = null

  try {
    body = await req.json()
  } catch (err) {
    console.error("❌ Failed to parse JSON body", err)
    return new Response("Invalid or missing JSON body", { status: 400 })
  }

  console.log("📦 Raw body:", body)

  const { user_id } = body ?? {}

  console.log("👤 Parsed user_id:", user_id)

  if (!user_id) {
    console.error("❌ Missing user_id")
    return new Response("Missing user_id", { status: 400 })
  }

  console.log("🔒 Preparing wallet payout")

  // Step 1: prepare payout (locks wallet + calculates amount)
  const { data, error } = await supabase.rpc(
    "create_wallet_payout",
    { p_user_id: user_id }
  )

  if (error || !data?.[0]) {
    console.error("❌ Payout prep failed", error)
    return new Response(error?.message ?? "Payout prep failed", {
      status: 400,
    })
  }

  const { payout_cents, stripe_account_id } = data[0]

  console.log("💰 Payout cents:", payout_cents)
  console.log("🏦 Stripe account ID:", stripe_account_id)

  try {
    console.log("➡️ Creating Stripe payout")

    // Step 2: create Stripe payout
    const payout = await stripe.payouts.create(
      {
        amount: payout_cents,
        currency: "usd",
      },
      {
        stripeAccount: stripe_account_id,
      }
    )

    console.log("✅ Stripe payout created:", payout.id)

    // Step 3: record payout
    await supabase.from("payouts").insert({
      user_id,
      amount_cents: payout_cents,
      method: "stripe",
      stripe_payout_id: payout.id,
      status: "paid",
    })

    console.log("📝 Payout recorded in DB")

    // Step 4: clear wallet
    await supabase
      .from("wallets")
      .update({
        available_balance_cents: 0,
        payout_locked: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id)

    console.log("🎉 Wallet cleared & payout complete")

    return Response.json({ success: true })
  } catch (err: any) {
    console.error("🔥 Stripe payout error:", err)

    // unlock wallet on failure
    await supabase
      .from("wallets")
      .update({ payout_locked: false })
      .eq("user_id", user_id)

    return new Response(`Stripe error: ${err.message}`, { status: 500 })
  }
})
