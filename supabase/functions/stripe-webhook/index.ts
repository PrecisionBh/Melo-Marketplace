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

  // 🔥 Fetch seller Pro status (DO NOT change escrow math)
const { data: sellerProfile, error: sellerErr } = await supabase
  .from("profiles")
  .select("is_pro")
  .eq("id", order.seller_id)
  .single()

if (sellerErr) {
  console.error("❌ Failed to fetch seller profile for fee calc:", sellerErr)
  return json(500, { error: "Seller profile fetch failed" })
}

// 🎯 Dynamic Melo seller fee
// Pro = 3.5%
// Free = 5%
// (Fee applies to item + shipping as per your architecture)
const isProSeller = sellerProfile?.is_pro === true
const sellerFeeRate = isProSeller ? 0.01 : 0.05

const sellerFeeCents = Math.round(escrowAmountCents * sellerFeeRate)
const sellerNetCents = escrowAmountCents - sellerFeeCents

console.log("💰 Dynamic seller fee applied", {
  orderId,
  seller_id: order.seller_id,
  is_pro: isProSeller,
  fee_rate: sellerFeeRate,
  escrow_amount_cents: escrowAmountCents,
  seller_fee_cents: sellerFeeCents,
  seller_net_cents: sellerNetCents,
})

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

 if (resolvedListingId) {
  // 🛒 Remove purchased item from buyer cart after successful payment
  try {
    const { error: cartDeleteErr } =
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", order.buyer_id)
        .eq("listing_id", resolvedListingId)

    if (cartDeleteErr) {
      console.error(
        "❌ Failed removing purchased item from cart",
        cartDeleteErr
      )
    } else {
      console.log(
        "🛒 Purchased item removed from cart",
        {
          buyer_id: order.buyer_id,
          listing_id: resolvedListingId,
        }
      )
    }
  } catch (cartErr) {
    console.error(
      "❌ Cart cleanup exception:",
      cartErr
    )
  }
}

// 🔔 Send notifications (buyer + seller)
try {
  console.log("🔔 Notification Debug:", {
    buyer_id: order.buyer_id,
    seller_id: order.seller_id,
    order_id: orderId,
  })

  // ✅ BUYER
  if (order.buyer_id) {
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: order.buyer_id,
        type: "order",
        title: "Order Successful",
        body: "Your order was successful and is now secured in escrow.",
        data: { route: `/orders/${orderId}` },
        dedupeKey: `order-paid-buyer-${orderId}`,
      }),
    })
  }

  // ✅ SELLER (only if different user)
  if (order.seller_id && order.seller_id !== order.buyer_id) {

    // 1️⃣ Informational
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: order.seller_id,
        type: "order",
        title: "New Order Paid",
        body: "A buyer has paid. Prepare the order for shipment.",
        data: { route: `/orders/${orderId}` },
        dedupeKey: `order-paid-seller-${orderId}`,
      }),
    })

    // 2️⃣ Action (ship order)
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: order.seller_id,
        type: "order_action",
        title: "📦 Please Ship This Order",
        body: "Payment is complete. Ship the order to receive your payout.",
        data: { route: `/orders/${orderId}` },
        dedupeKey: `order-ship-${orderId}`,
      }),
    })
  }

} catch (notifErr) {
  console.error("❌ Notification failed:", notifErr)
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
const isFirstActivation = !profile.pro_activated_at

// 🎯 FINAL CREDIT RULE: ONLY first activation
const grantCredits = isFirstActivation

// ✅ Boosts + 1 Mega Boost (first activation only)
const grantBoosts = grantCredits ? 5 : 0
const grantMegaBoosts = grantCredits ? 1 : 0

// 🔥 IMPORTANT: Stack credits (DO NOT overwrite)
const newBoostTotal = currentBoosts + grantBoosts
const newMegaBoostTotal = currentMegaBoosts + grantMegaBoosts

const { error: updateError } = await supabase
  .from("profiles")
  .update({
    is_pro: true,
    pro_activated_at: profile.pro_activated_at || nowIso,
    pro_expires_at: nextMonthIso,

    // 🚀 Stacked economy
    boosts_remaining: newBoostTotal,
    mega_boosts_remaining: newMegaBoostTotal,

    // 🧠 Only set reset timestamps if we granted credits (optional, but safe)
    last_boost_reset: grantCredits ? nowIso : profile.last_boost_reset,
    last_mega_boost_reset: profile.last_mega_boost_reset ?? nowIso,

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

  // ================================
  // 🛑 CANCEL / EXPIRED CHECKOUT
  // ================================
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}

    const orderId = metadata.order_id
    const orderIdsRaw = metadata.order_ids

    console.log("⚠️ Checkout session expired", {
      orderId,
      orderIdsRaw,
    })

    try {
      if (orderId) {
        await supabase
          .from("orders")
          .update({
            status: "cancelled_payment",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .eq("status", "pending_payment")
      }

      if (orderIdsRaw) {
        const orderIds: string[] = JSON.parse(orderIdsRaw)

        for (const id of orderIds) {
          await supabase
            .from("orders")
            .update({
              status: "cancelled_payment",
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("status", "pending_payment")
        }
      }

      console.log("🛑 Orders marked as cancelled_payment")
    } catch (err) {
      console.error("❌ Failed to cancel expired session", err)
    }

    return json(200, { received: true })
  }

  // ================================
  // ✅ SUCCESS HANDLER
  // ================================
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}

    const orderId = metadata.order_id
    const orderIdsRaw = metadata.order_ids

    // 🔹 SINGLE ORDER
    if (orderId) {
      return await markOrderPaid({
        orderId,
        sessionId: session.id,
        paymentIntentId:
          session.payment_intent as string | null,
        amountTotal:
          session.amount_total ?? null,
      })
    }

    // 🔹 MULTI ORDER CART
    if (orderIdsRaw) {
      try {
        const orderIds: string[] = JSON.parse(orderIdsRaw)

        for (const id of orderIds) {
          await markOrderPaid({
            orderId: id,
            sessionId: session.id,
            paymentIntentId:
              session.payment_intent as string | null,
          })
        }

        return json(200, { received: true })
      } catch (err) {
        console.error("❌ Failed parsing order_ids:", err)
        return json(400, { error: "Invalid order_ids metadata" })
      }
    }

    return json(200, { received: true })
  }

  // ================================
  // 💸 PAYOUT
  // ================================
  if (event.type === "payout.paid") {
    const payout = event.data.object as Stripe.Payout

    await supabase
      .from("payouts")
      .update({
        status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_payout_id", payout.id)

    return json(200, { received: true })
  }

  // ================================
  // 📅 SUB UPDATE (noop)
  // ================================
  if (event.type === "customer.subscription.updated") {
    return json(200, { received: true })
  }

  // ================================
  // 🚫 SUB DELETED
  // ================================
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription
    const stripeCustomerId = subscription.customer as string

    const { error } = await supabase
      .from("profiles")
      .update({
        is_pro: false,
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", stripeCustomerId)

    if (error) {
      console.error("❌ Failed to deactivate Melo Pro:", error)
      return json(500, { error: "Failed to deactivate Melo Pro" })
    }

    return json(200, { received: true })
  }

  return json(200, { received: true })
})