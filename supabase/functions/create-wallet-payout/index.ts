/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const { user_id, amount_cents, method } = await req.json()

    if (!user_id || !amount_cents || !method) {
      return new Response("Missing fields", { status: 400 })
    }

    if (!["ach", "instant"].includes(method)) {
      return new Response("Invalid payout method", { status: 400 })
    }

    // 🔒 Load wallet
    const { data: wallet } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user_id)
      .single()

    if (!wallet || wallet.payout_locked) {
      return new Response("Wallet unavailable", { status: 409 })
    }

    if (wallet.available_balance_cents < amount_cents) {
      return new Response("Insufficient balance", { status: 400 })
    }

    // 🔒 Lock wallet
    await supabase
      .from("wallets")
      .update({ payout_locked: true })
      .eq("id", wallet.id)

    // 🔁 Get Stripe account
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user_id)
      .single()

    if (!profile?.stripe_account_id) {
      throw new Error("Stripe account not connected")
    }

    // 💸 Create payout
    const payout = await stripe.payouts.create(
      {
        amount: amount_cents,
        currency: wallet.currency,
        method: method === "instant" ? "instant" : "standard",
      },
      {
        stripeAccount: profile.stripe_account_id,
      }
    )

    // 🧾 Record payout
    await supabase.from("payouts").insert({
      user_id,
      wallet_id: wallet.id,
      amount_cents,
      method,
      stripe_payout_id: payout.id,
      status: payout.status,
    })

    // 💰 Update wallet
    await supabase
      .from("wallets")
      .update({
        available_balance_cents:
          wallet.available_balance_cents - amount_cents,
        payout_locked: false,
      })
      .eq("id", wallet.id)

    return new Response(
      JSON.stringify({ success: true, payout_id: payout.id }),
      { status: 200 }
    )
  } catch (err: any) {
    console.error(err)

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    )
  }
})
