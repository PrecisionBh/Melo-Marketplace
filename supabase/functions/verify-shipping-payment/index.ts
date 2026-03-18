import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.25.0"
import { createClient } from "npm:@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
})

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

serve(async (req) => {
  try {
    const { sessionId, orderId } = await req.json()

    if (!sessionId || !orderId) {
      return new Response(JSON.stringify({ error: "Missing data" }), {
        status: 400,
      })
    }

    console.log("🔍 Verifying shipping payment:", { sessionId, orderId })

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session || session.payment_status !== "paid") {
      console.error("❌ Payment not completed:", session?.payment_status)

      return new Response(JSON.stringify({ error: "Payment not completed" }), {
        status: 400,
      })
    }

    // 🔒 Prevent duplicate updates
    const { data: existing } = await supabase
      .from("orders")
      .select("shipping_payment_intent_id")
      .eq("id", orderId)
      .single()

    if (existing?.shipping_payment_intent_id) {
      console.log("⚠️ Payment already verified:", orderId)

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
      })
    }

    // 💰 Extract Stripe values safely
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id

    const amount = session.amount_total

    if (!paymentIntentId || !amount) {
      console.error("❌ Missing Stripe data:", {
        paymentIntentId,
        amount,
      })

      return new Response(JSON.stringify({ error: "Invalid Stripe data" }), {
        status: 500,
      })
    }

    console.log("💰 Saving shipping payment:", {
      orderId,
      paymentIntentId,
      amount,
    })

    const { error } = await supabase
      .from("orders")
      .update({
        shipping_payment_intent_id: paymentIntentId,
        shipping_label_cost_cents: amount, // ✅ SOURCE OF TRUTH
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (error) {
      console.error("❌ DB update failed:", error)
      throw error
    }

    console.log("✅ Shipping payment verified and saved")

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    })
  } catch (err) {
    console.error("❌ verify-shipping-payment error:", err)

    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    })
  }
})