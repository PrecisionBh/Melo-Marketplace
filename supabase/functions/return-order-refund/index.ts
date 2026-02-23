/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import Stripe from "npm:stripe@13.11.0"

console.log("🚀 return-order-refund function booted")

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

    /* ---------------- AUTH SELLER ---------------- */
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

    // 🔒 ONLY SELLER CAN CONFIRM RETURN RECEIPT
    if (order.seller_id !== user.id) {
      return json(403, {
        error: "Only the seller can confirm return receipt",
      })
    }

    /* ---------------- BUSINESS RULES (RETURN FLOW) ---------------- */

    // ✅ UPDATED: Active return state is now "return_started"
    // ❄️ "return_processing" is reserved for disputed/paused returns
    if (order.status !== "return_started") {
      return json(400, {
        error: "Order is not in return started state",
      })
    }

    // Prevent double refunds
    if (order.escrow_status === "refunded") {
      return json(400, { error: "Order already refunded" })
    }

    if (order.escrow_status === "released") {
      return json(400, {
        error: "Cannot refund — escrow already released to seller",
      })
    }

    // Buyer must have shipped return
    if (!order.return_tracking_number) {
      return json(400, {
        error: "Return tracking has not been submitted by the buyer",
      })
    }

    if (!order.return_shipped_at) {
      return json(400, {
        error: "Return shipment not confirmed yet",
      })
    }

    // Prevent duplicate seller confirmations
    if (order.return_received === true) {
      return json(400, {
        error: "Return already marked as received",
      })
    }

    if (!order.stripe_payment_intent) {
      return json(400, {
        error: "Missing Stripe payment intent",
      })
    }

    /* ---------------- CALCULATE REFUND (ITEM + SHIPPING + TAX ONLY) ---------------- */
    console.log("💸 Creating RETURN refund:", {
      order_id: order.id,
      item_price_cents: order.item_price_cents,
      shipping_amount_cents: order.shipping_amount_cents,
      tax_cents: order.tax_cents,
      buyer_fee_cents: order.buyer_fee_cents,
    })

    const refundableAmount =
      (order.item_price_cents ?? 0) +
      (order.shipping_amount_cents ?? 0) +
      (order.tax_cents ?? 0) // refund tax, exclude buyer fee

    if (refundableAmount <= 0) {
      return json(400, { error: "Invalid refundable amount" })
    }

    /* ---------------- STRIPE REFUND ---------------- */
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent,
      amount: refundableAmount,
    })

    if (!refund || refund.status !== "succeeded") {
      console.error("❌ Return refund failed:", refund)
      return json(500, { error: "Refund failed" })
    }

    const now = new Date().toISOString()

    /* ---------------- REVERSE SELLER PENDING WALLET (IF PRE-CREDITED) ---------------- */
    if (order.wallet_credited && typeof order.seller_net_cents === "number") {
      console.log("↩️ Reversing seller pending wallet (return):", {
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

    /* ---------------- UPDATE ORDER (AUDIT-CORRECT RETURN STATE) ---------------- */
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "returned", // 🔥 AUDIT-CORRECT (NOT cancelled)
        escrow_status: "refunded",
        return_received: true,
        wallet_credited: false, // prevents future double reversals
        updated_at: now,
      })
      .eq("id", order.id)

    if (updateErr) {
      console.error("❌ Return refund update failed:", updateErr)
      return json(500, { error: "Failed to update order" })
    }

    /* ---------------- NOTIFY BUYER ---------------- */
    try {
      if (order.buyer_id) {
        await supabase.from("notifications").insert({
          user_id: order.buyer_id,
          type: "order",
          title: "Return Approved & Refunded 💸",
          body:
            "The seller has received your returned item and your refund has been issued. Funds may take a few business days to appear.",
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
              title: "Refund Issued 💸",
              body:
                "Your return was approved and your refund has been issued.",
              data: {
                type: "order",
                route: "/buyer-hub/orders/[id]",
                params: { id: order.id },
              },
            }),
          })
        }
      }

      /* ---------------- NOTIFY SELLER ---------------- */
      if (order.seller_id) {
        await supabase.from("notifications").insert({
          user_id: order.seller_id,
          type: "order",
          title: "Return Completed & Refunded ✅",
          body:
            "You confirmed the returned item. The buyer has been refunded and the case is closed.",
          data: {
            route: "/seller-hub/orders/[id]",
            params: { id: order.id },
          },
        })
      }
    } catch (notifyErr) {
      console.warn("[notify return_refund] failed:", notifyErr)
    }

    console.log("✅ Return refund + wallet reversal + audit update complete")

    return json(200, {
      success: true,
      refundId: refund.id,
    })
  } catch (err) {
    console.error("🔥 return-order-refund error:", err)
    return json(500, { error: "Internal error" })
  }
})