/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/* ---------------- ENV ---------------- */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

/* ---------------- HANDLER ---------------- */

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  try {
    const { order_id } = await req.json()

    if (!order_id) {
      return new Response("Missing order_id", { status: 400 })
    }

    /* ---------------- LOAD ORDER ---------------- */

    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id,
        seller_id,
        seller_payout_cents,
        escrow_released,
        wallet_credited
      `)
      .eq("id", order_id)
      .single()

    if (error || !order) {
      return new Response("Order not found", { status: 404 })
    }

    // 🔒 HARD GUARDS
    if (!order.escrow_released) {
      return new Response("Escrow not released", { status: 409 })
    }

    if (order.wallet_credited) {
      return new Response(
        JSON.stringify({ success: true, duplicate: true }),
        { status: 200 }
      )
    }

    /* ---------------- CREDIT WALLET ---------------- */

    const { error: walletError } = await supabase.rpc(
      "credit_wallet_after_escrow",
      { p_order_id: order_id }
    )

    if (walletError) {
      throw walletError
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    )
  } catch (err: any) {
    console.error("Escrow release error:", err)
    return new Response(
      JSON.stringify({
        error: err.message ?? "Failed to credit wallet",
      }),
      { status: 500 }
    )
  }
})
