/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

console.log("🚀 execute-stripe-payout (escrow release) booted")

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

Deno.serve(async (req) => {
  let body
  try {
    body = await req.json()
  } catch {
    return new Response("Invalid JSON body", { status: 400 })
  }

  const { user_id, order_id } = body ?? {}
  if (!user_id || !order_id) {
    return new Response("Missing user_id or order_id", { status: 400 })
  }

  console.log("➡️ Escrow release requested", { user_id, order_id })

  /* -----------------------------------------------------
     STEP 1: Fetch order
  ----------------------------------------------------- */

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(`
      id,
      buyer_id,
      seller_id,
      seller_net_cents,
      escrow_released,
      escrow_funded_at
    `)
    .eq("id", order_id)
    .single()

  if (orderErr || !order) {
    console.error("❌ Order not found", orderErr)
    return new Response("Order not found", { status: 404 })
  }

  /* -----------------------------------------------------
     STEP 2: AUTHORIZE BUYER
  ----------------------------------------------------- */

  if (order.buyer_id !== user_id) {
    return new Response("Unauthorized buyer", { status: 403 })
  }

  if (order.escrow_released) {
    return Response.json({ success: true, already_released: true })
  }

  if (!order.escrow_funded_at) {
    return new Response("Escrow not funded", { status: 409 })
  }

  const seller_id = order.seller_id
  const payout_cents = order.seller_net_cents

  /* -----------------------------------------------------
     STEP 3: Lock SELLER wallet
  ----------------------------------------------------- */

  const { error: lockErr } = await supabase
    .from("wallets")
    .update({ payout_locked: true })
    .eq("user_id", seller_id)
    .eq("payout_locked", false)

  if (lockErr) {
    return new Response("Wallet is locked", { status: 409 })
  }

  /* -----------------------------------------------------
     STEP 4: Check PLATFORM Stripe balance
  ----------------------------------------------------- */

  const balance = await stripe.balance.retrieve()
  const availableUSD =
    balance.available.find(b => b.currency === "usd")?.amount ?? 0

  if (availableUSD < payout_cents) {
    await supabase
      .from("wallets")
      .update({ payout_locked: false })
      .eq("user_id", seller_id)

    return new Response(
      JSON.stringify({
        error: "Stripe funds not available yet",
        code: "STRIPE_FUNDS_PENDING",
      }),
      { status: 409 }
    )
  }

  /* -----------------------------------------------------
     STEP 5: Stripe transfer PLATFORM → SELLER
  ----------------------------------------------------- */

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", seller_id)
    .single()

  if (profileErr || !profile?.stripe_account_id) {
    return new Response("Seller Stripe account missing", { status: 400 })
  }

  const transfer = await stripe.transfers.create({
    amount: payout_cents,
    currency: "usd",
    destination: profile.stripe_account_id,
    metadata: {
      order_id,
      seller_id,
    },
  })

  /* -----------------------------------------------------
     STEP 6: Finalize escrow in Supabase (AFTER Stripe)
  ----------------------------------------------------- */

  const { error: rpcErr } = await supabase.rpc(
    "release_order_escrow",
    {
      p_order_id: order_id,
      p_stripe_transfer_id: transfer.id,
    }
  )

  if (rpcErr) {
    console.error("❌ Ledger finalize failed", rpcErr)
    return new Response(
      JSON.stringify({
        error: "Stripe paid but ledger finalize failed",
        stripe_transfer_id: transfer.id,
      }),
      { status: 500 }
    )
  }

  return Response.json({
    success: true,
    stripe_transfer_id: transfer.id,
  })
})
