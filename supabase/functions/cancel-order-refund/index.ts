/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import Stripe from "npm:stripe@13.11.0"

console.log("🚀 cancel-order-refund function booted")

// ---------------- ENV ----------------
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY")
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL")
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

// ---------------- CLIENTS ----------------
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ---------------- CORS ----------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// ---------------- HELPERS ----------------
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  })
}

// ---------------- HANDLER ----------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    })
  }

  try {
    const { order_id } = await req.json()

    if (!order_id) {
      return json(400, { error: "Missing order_id" })
    }

    /* ---------------- AUTH USER (BUYER OR SELLER) ---------------- */
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return json(401, { error: "Missing auth header" })
    }

    const token = authHeader.replace("Bearer ", "")

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return json(401, { error: "Unauthorized" })
    }

    /* ---------------- LOAD ORDER ---------------- */
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single()

    if (orderError || !order) {
      console.error("❌ Order not found:", orderError)
      return json(404, { error: "Order not found" })
    }

    /* ---------------- DETERMINE WHO CANCELLED ---------------- */
    const isBuyerCancelling = order.buyer_id === user.id
    const isSellerCancelling = order.seller_id === user.id

    if (!isBuyerCancelling && !isSellerCancelling) {
      return json(403, { error: "Not authorized to cancel this order" })
    }

    const cancelledBy = isSellerCancelling ? "seller" : "buyer"

    /* ---------------- BUSINESS RULES ---------------- */
    if (order.status === "cancelled") {
      return json(400, { error: "Order already cancelled" })
    }

    if (order.status === "shipped" || order.shipped_at) {
      return json(400, {
        error: "Cannot cancel after the order has been shipped",
      })
    }

    if (order.status === "delivered" || order.status === "completed") {
      return json(400, {
        error: "Cannot cancel after delivery",
      })
    }

    if (order.escrow_status === "released") {
      return json(400, {
        error: "Cannot cancel — escrow already released",
      })
    }

    if (!order.stripe_payment_intent) {
      return json(400, {
        error: "Missing Stripe payment intent",
      })
    }

    /* ---------------- STRIPE REFUND (ITEM + SHIPPING + TAX, EXCLUDES BUYER FEE) ---------------- */
    console.log("💸 Creating refund (item + shipping + tax, excluding buyer fee):", {
      order_id: order.id,
      item_price_cents: order.item_price_cents,
      shipping_amount_cents: order.shipping_amount_cents,
      tax_cents: order.tax_cents,
      buyer_fee_cents: order.buyer_fee_cents,
      cancelledBy,
    })

    const refundableAmount =
      (order.item_price_cents ?? 0) +
      (order.shipping_amount_cents ?? 0) +
      (order.tax_cents ?? 0)

    if (refundableAmount <= 0) {
      return json(400, { error: "Invalid refundable amount" })
    }

    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent,
      amount: refundableAmount,
    })

    if (!refund || refund.status !== "succeeded") {
      console.error("❌ Refund failed:", refund)
      return json(500, { error: "Refund failed" })
    }

    const now = new Date().toISOString()

    /* ---------------- REVERSE SELLER PENDING WALLET (THIS ORDER ONLY) ---------------- */
    if (order.wallet_credited && typeof order.seller_net_cents === "number") {
      console.log("↩️ Reversing seller pending wallet (per-order):", {
        seller_id: order.seller_id,
        amount: order.seller_net_cents,
      })

      const { error: walletErr } = await supabase.rpc(
        "increment_wallet_pending",
        {
          p_user_id: order.seller_id,
          p_amount_cents: -order.seller_net_cents,
        }
      )

      if (walletErr) {
        console.error("❌ Wallet reversal failed:", walletErr)
        return json(500, { error: "Wallet reversal failed" })
      }
    }

    /* ---------------- UPDATE ORDER ---------------- */
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: cancelledBy === "seller" ? "cancelled_by_seller" : "cancelled",
        escrow_status: "refunded",
        wallet_credited: false,
        updated_at: now,
      })
      .eq("id", order.id)

    if (updateErr) {
      console.error("❌ Order cancel update failed:", updateErr)
      return json(500, { error: "Failed to update order" })
    }

    /* ---------------- NOTIFICATIONS (DYNAMIC ACTOR) ---------------- */
    try {
      /* -------- NOTIFY SELLER -------- */
      if (order.seller_id) {
        const sellerTitle =
          cancelledBy === "seller"
            ? "Order Cancelled (You Cancelled) ❌"
            : "Order Cancelled by Buyer ❌"

        const sellerBody =
          cancelledBy === "seller"
            ? "You cancelled this order. The buyer has been refunded and escrow is closed."
            : "The buyer has cancelled this order. You can relist your item from your My Listings page."

        await supabase.from("notifications").insert({
          user_id: order.seller_id,
          type: "order",
          title: sellerTitle,
          body: sellerBody,
          data: {
            route: "/seller-hub/orders/[id]",
            params: { id: order.id },
          },
        })

        const { data: profile } = await supabase
          .from("profiles")
          .select("expo_push_token, notifications_enabled")
          .eq("id", order.seller_id)
          .single()

        if (profile?.expo_push_token && profile.notifications_enabled !== false) {
          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: profile.expo_push_token,
              title: sellerTitle,
              body: sellerBody,
              data: {
                type: "order",
                route: "/seller-hub/orders/[id]",
                params: { id: order.id },
              },
            }),
          })
        }
      }

      /* -------- NOTIFY BUYER -------- */
      if (order.buyer_id) {
        const buyerTitle =
          cancelledBy === "seller"
            ? "Order Cancelled by Seller ❌"
            : "Order Cancelled 💸"

        const buyerBody =
          cancelledBy === "seller"
            ? "The seller has cancelled this order. Your refund is now being processed."
            : "You cancelled this order. Your refund is now being processed."

        await supabase.from("notifications").insert({
          user_id: order.buyer_id,
          type: "order",
          title: buyerTitle,
          body: buyerBody,
          data: {
            route: "/buyer-hub/orders/[id]",
            params: { id: order.id },
          },
        })

        const { data: buyerProfile } = await supabase
          .from("profiles")
          .select("expo_push_token, notifications_enabled")
          .eq("id", order.buyer_id)
          .single()

        if (
          buyerProfile?.expo_push_token &&
          buyerProfile.notifications_enabled !== false
        ) {
          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: buyerProfile.expo_push_token,
              title: buyerTitle,
              body: buyerBody,
              data: {
                type: "order",
                route: "/buyer-hub/orders/[id]",
                params: { id: order.id },
              },
            }),
          })
        }
      }
    } catch (notifyErr) {
      console.warn("[notify order_cancelled] failed:", notifyErr)
    }

    console.log("✅ Cancellation + refund + wallet reversal complete")

    return json(200, {
      success: true,
      refundId: refund.id,
      cancelledBy,
    })
  } catch (err) {
    console.error("🔥 cancel-order-refund error:", err)
    return json(500, { error: "Internal error" })
  }
})