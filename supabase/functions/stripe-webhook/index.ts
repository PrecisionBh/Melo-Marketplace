/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import Stripe from "npm:stripe@13.11.0"

console.log("🚀 stripe-webhook loaded")

// ---------------- ENV ----------------
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY")
if (!STRIPE_WEBHOOK_SECRET) throw new Error("Missing STRIPE_WEBHOOK_SECRET")
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL")
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

// ---------------- CLIENTS ----------------
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

// ---------------- HELPERS ----------------
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

async function markOrderPaid(params: {
  orderId: string
  sessionId?: string | null
  paymentIntentId?: string | null
  amountTotal?: number | null
}) {
  const { orderId, sessionId, paymentIntentId, amountTotal } = params

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      status,
      listing_id,
      offer_id,
      amount_cents,
      item_price_cents,
      shipping_amount_cents,
      tax_cents,
      seller_id,
      buyer_id,
      paid_at,
      escrow_funded_at,
      wallet_credited,
      quantity
    `)
    .eq("id", orderId)
    .single()

  if (error || !order) {
    console.error("❌ Order not found:", orderId, error)
    return json(404, { error: "Order not found" })
  }

  if (order.wallet_credited && order.status === "paid") {
    console.log("⚠️ Order already paid:", orderId)
    return json(200, { received: true })
  }

  if (typeof amountTotal === "number" && amountTotal !== order.amount_cents) {
    console.error("❌ Amount mismatch", {
      orderId,
      stripe: amountTotal,
      db: order.amount_cents,
    })
    return new Response("Amount mismatch", { status: 400 })
  }

  const now = new Date().toISOString()

  let resolvedListingId = order.listing_id

  if (!resolvedListingId && order.offer_id) {
    const { data: offer, error: offerErr } = await supabase
      .from("offers")
      .select("listing_id")
      .eq("id", order.offer_id)
      .single()

    if (offerErr || !offer?.listing_id) {
      console.error("❌ Failed to resolve listing from offer", offerErr)
      return json(500, { error: "Offer listing resolution failed" })
    }

    resolvedListingId = offer.listing_id

    await supabase
      .from("orders")
      .update({ listing_id: resolvedListingId })
      .eq("id", orderId)
  }

  if (!order.item_price_cents) {
    console.error("❌ Missing item_price_cents for escrow", orderId)
    return json(500, { error: "Missing item price for escrow" })
  }

  const escrowAmountCents =
    order.item_price_cents + (order.shipping_amount_cents ?? 0)

  const sellerFeeCents = Math.round(escrowAmountCents * 0.04)
  const sellerNetCents = escrowAmountCents - sellerFeeCents

  console.log("🧮 Escrow calculation (fee includes shipping, excludes tax)", {
    orderId,
    item_price_cents: order.item_price_cents,
    shipping_amount_cents: order.shipping_amount_cents ?? 0,
    escrow_amount_cents: escrowAmountCents,
    seller_fee_cents: sellerFeeCents,
    seller_net_cents: sellerNetCents,
  })

  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: now,
      stripe_session_id: sessionId ?? null,
      stripe_payment_intent: paymentIntentId ?? null,
      seller_fee_cents: sellerFeeCents,
      seller_net_cents: sellerNetCents,
      seller_payout_cents: null,
      escrow_amount_cents: escrowAmountCents,
      tax_cents: order.tax_cents ?? 0,
      escrow_status: "pending",
      escrow_funded_at: now,
      updated_at: now,
    })
    .eq("id", orderId)

  if (updateErr) {
    console.error("❌ Order update failed:", orderId, updateErr)
    return json(500, { error: "Order update failed" })
  }

  console.log("✅ Order PAID + escrow funded:", orderId)

  if (!order.wallet_credited) {
    const { error: walletErr } = await supabase.rpc(
      "increment_wallet_pending",
      {
        p_user_id: order.seller_id,
        p_amount_cents: sellerNetCents,
      }
    )

    if (walletErr) {
      console.error("❌ Wallet pending credit failed", walletErr)
      return json(500, { error: "Wallet credit failed" })
    }

    await supabase
      .from("orders")
      .update({ wallet_credited: true })
      .eq("id", orderId)
  }

  if (resolvedListingId) {
    const purchasedQty =
      typeof (order as any).quantity === "number" && (order as any).quantity > 0
        ? (order as any).quantity
        : 1

    const { data: listing, error: listingErr } = await supabase
      .from("listings")
      .select("id, quantity_available")
      .eq("id", resolvedListingId)
      .single()

    if (listingErr || !listing) {
      console.error("❌ Failed to load listing for quantity update", {
        orderId,
        resolvedListingId,
        listingErr,
      })
      return json(200, { received: true })
    }

    const currentQty =
      typeof (listing as any).quantity_available === "number"
        ? (listing as any).quantity_available
        : 1

    const nextQtyRaw = currentQty - purchasedQty
    const nextQty = nextQtyRaw <= 0 ? 0 : nextQtyRaw

    await supabase
      .from("listings")
      .update({
        quantity_available: nextQty,
        is_sold: nextQty <= 0,
        status: nextQty <= 0 ? "inactive" : "active",
        updated_at: now,
      })
      .eq("id", resolvedListingId)
  }
  // 🔔 Send notifications (buyer + seller)
try {
  console.log("🔔 Notification Debug:", {
    buyer_id: order.buyer_id,
    seller_id: order.seller_id,
    order_id: orderId,
  })

  const nowIso = now

  // If buyer and seller are the same (dev testing), send ONE notification
  const isSelfPurchase = order.buyer_id === order.seller_id

  if (order.buyer_id) {
    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: order.buyer_id,
        type: "order",
        title: isSelfPurchase
          ? "Test Order Paid"
          : "Order Successful",
        body: isSelfPurchase
          ? "Your test order was processed successfully."
          : "Your order was successful and is now secured in escrow.",
        data: { route: `/buyer-hub/orders/${orderId}` },
        read: false,
        created_at: nowIso,
      })

    if (notifError) {
      console.error("❌ Buyer notification failed:", notifError)
    }
  }

  // Only send seller notification if different user
  if (order.seller_id && order.seller_id !== order.buyer_id) {
    const { error: sellerNotifError } = await supabase
      .from("notifications")
      .insert({
        user_id: order.seller_id,
        type: "order",
        title: "New Order Paid",
        body: "A buyer has paid. Prepare the order for shipment.",
        data: { route: `/seller-hub/orders/${orderId}` },
        read: false,
        created_at: nowIso,
      })

    if (sellerNotifError) {
      console.error("❌ Seller notification failed:", sellerNotifError)
    }
  }
} catch (notifErr) {
  console.error("❌ Notification insert failed:", notifErr)
}

  return json(200, { received: true })
}

async function activateMeloPro(params: {
  userId: string
  stripeCustomerId?: string | null
  subscriptionId?: string | null
}) {
  const { userId, stripeCustomerId, subscriptionId } = params

  const now = new Date()
  const nowIso = now.toISOString()

  const nextMonth = new Date(now)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const nextMonthIso = nextMonth.toISOString()

  // 🔍 Fetch current profile FIRST (prevents overwriting stacked credits)
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select(
      "boosts_remaining, mega_boosts_remaining, is_pro, pro_activated_at, last_boost_reset"
    )
    .eq("id", userId)
    .single()

  if (fetchError || !profile) {
    console.error("❌ Failed to fetch profile before Pro activation:", fetchError)
    return json(500, { error: "Profile fetch failed" })
  }

  const currentBoosts = profile.boosts_remaining ?? 0
  const currentMegaBoosts = profile.mega_boosts_remaining ?? 0

  // 🧠 Detect TRUE first-time activation (never had Pro before)
  const isFirstActivation =
    profile.is_pro !== true && !profile.pro_activated_at

  // 🔁 Resubscribe logic:
  // If user had Pro before, only grant credits if 30+ days since last reset
  let shouldGrantMonthlyCredits = false

  if (!profile.last_boost_reset) {
    // No reset history = eligible (new or legacy user)
    shouldGrantMonthlyCredits = true
  } else {
    const lastResetDate = new Date(profile.last_boost_reset)
    const diffMs = now.getTime() - lastResetDate.getTime()
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

    if (diffMs >= THIRTY_DAYS_MS) {
      shouldGrantMonthlyCredits = true
    }
  }

  // 🎯 FINAL CREDIT GRANT RULES
  // - First activation → grant
  // - Resubscribe after 30+ days → grant
  // - Active Pro renewing within cycle → NO grant (RPC handles refills)
  const grantCredits = isFirstActivation || shouldGrantMonthlyCredits

  const grantBoosts = grantCredits ? 5 : 0
  const grantMegaBoosts = grantCredits ? 1 : 0

  // 🔥 IMPORTANT: Stack credits (DO NOT overwrite for Melo economy)
  const newBoostTotal = currentBoosts + grantBoosts
  const newMegaBoostTotal = currentMegaBoosts + grantMegaBoosts

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      is_pro: true,
      pro_activated_at: profile.pro_activated_at || nowIso,
      pro_expires_at: nextMonthIso,

      // 🚀 Stacked economy (wild west model)
      boosts_remaining: newBoostTotal,
      mega_boosts_remaining: newMegaBoostTotal,

      // 🧠 Only update reset timestamp IF we actually granted credits
      last_boost_reset: grantCredits ? nowIso : profile.last_boost_reset,

      stripe_customer_id: stripeCustomerId ?? null,
      stripe_subscription_id: subscriptionId ?? null,
      updated_at: nowIso,
    })
    .eq("id", userId)

  if (updateError) {
    console.error("❌ Failed to activate Melo Pro:", updateError)
    return json(500, { error: "Failed to activate Melo Pro" })
  }

  console.log("👑 Melo Pro activation processed:", {
    userId,
    first_activation: isFirstActivation,
    monthly_reset_eligible: shouldGrantMonthlyCredits,
    granted_boosts: grantBoosts,
    granted_mega_boosts: grantMegaBoosts,
    final_boost_total: newBoostTotal,
    final_mega_boost_total: newMegaBoostTotal,
  })

  return json(200, { received: true })
}

// ---------------- HANDLER ----------------
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 })
  }

  const body = new Uint8Array(await req.arrayBuffer())

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error("❌ Stripe signature verification failed", err)
    return new Response("Invalid signature", { status: 400 })
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}

    const orderId = metadata.order_id
    const userId = metadata.user_id
    const type = metadata.type

    if (type === "melo_pro_subscription" && userId) {
      return await activateMeloPro({
        userId,
        stripeCustomerId: session.customer as string | null,
        subscriptionId: session.subscription as string | null,
      })
    }

    if (orderId) {
      return await markOrderPaid({
        orderId,
        sessionId: session.id,
        paymentIntentId: session.payment_intent as string | null,
        amountTotal: session.amount_total ?? null,
      })
    }

    return json(200, { received: true })
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent
    const orderId = intent.metadata?.order_id

    if (!orderId) return json(200, { received: true })

    return await markOrderPaid({
      orderId,
      paymentIntentId: intent.id,
      amountTotal: intent.amount_received ?? null,
    })
  }

  if (event.type === "payout.paid") {
    const payout = event.data.object as Stripe.Payout
    const stripePayoutId = payout.id

    console.log("💸 Payout paid webhook received", {
      payout_id: stripePayoutId,
      status: payout.status,
      amount: payout.amount,
    })

    await supabase
      .from("payouts")
      .update({
        status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_payout_id", stripePayoutId)

    return json(200, { received: true })
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription

    if (subscription.cancel_at_period_end === true) {
      console.log("📅 Melo Pro scheduled to cancel at period end:", subscription.id)
      return json(200, { received: true })
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription
    const stripeCustomerId = subscription.customer as string

    console.log("🚫 Melo Pro subscription fully canceled:", subscription.id)

    const { error } = await supabase
      .from("profiles")
      .update({
        is_pro: false,
        boosts_remaining: 0,
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", stripeCustomerId)

    if (error) {
      console.error("❌ Failed to deactivate Melo Pro:", error)
      return json(500, { error: "Failed to deactivate Melo Pro" })
    }

    console.log("✅ Melo Pro access revoked")
    return json(200, { received: true })
  }

  return json(200, { received: true })
})