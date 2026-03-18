import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.25.0"
import { createClient } from "npm:@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-06-20",
})

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { orderId, rate } = await req.json()

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing orderId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    if (!rate?.amount) {
      return new Response(
        JSON.stringify({ error: "Missing rate amount" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const amountInCents = Math.round(Number(rate.amount) * 100)

    if (!amountInCents || amountInCents < 1) {
      return new Response(
        JSON.stringify({ error: "Invalid rate amount" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // 🔥 FETCH PUBLIC ORDER NUMBER
    const { data: order } = await supabase
      .from("orders")
      .select("public_order_number")
      .eq("id", orderId)
      .single()

    const publicOrderNumber = order?.public_order_number || orderId

    // ✅ CORRECT MOBILE DEEP LINKS (melomp scheme)
    const successUrl =
      Deno.env.get("LABEL_CHECKOUT_SUCCESS_URL") ||
      `melomp://shipping-success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}&rateId=${rate.object_id}`

    const cancelUrl =
      Deno.env.get("LABEL_CHECKOUT_CANCEL_URL") ||
      "melomp://shipping-cancel"

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Melo Shipping Label`,
              description: `Order ${publicOrderNumber} • ${
                rate.provider || "Carrier"
              } - ${rate.servicelevel?.name || "Shipping"}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        order_id: String(orderId),
        rate_id: String(rate.object_id || ""),
        provider: String(rate.provider || ""),
        service: String(rate.servicelevel?.name || ""),
        amount: String(rate.amount || ""),
        currency: String(rate.currency || "USD"),
        estimated_days: String(rate.estimated_days || ""),
      },

      // 🔥 RETURNS USER BACK INTO YOUR APP
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("create-label-checkout error:", error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})