/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

console.log("🚀 create-boost-checkout booted")

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const PRICE_MAP: Record<string, string> = {
  boost_3: "price_1T6x1YDrYUL6FG4RumR5Izao",
  boost_10: "price_1T6x2YDrYUL6FG4Rd9Z85R68",
  boost_25: "price_1T6x3UDrYUL6FG4RORFI5ol4",
  mega_1: "price_1T6x5EDrYUL6FG4Rz8o5tlV9",
  mega_3: "price_1T6x69DrYUL6FG4RzMGq1zmS",
  mega_8: "price_1T6x7UDrYUL6FG4RRnLN5D4h",
}

Deno.serve(async (req) => {
  try {
    console.log("🔥 Function invoked")

    const body = await req.json()
    console.log("📦 Body:", body)

    const { userId, packageId } = body

    if (!userId || !packageId) {
      return new Response(
        JSON.stringify({ error: "Missing userId or packageId" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const priceId = PRICE_MAP[packageId]

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Invalid packageId" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Fetch profile including Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, stripe_customer_id, email")
      .eq("id", userId)
      .single()

    if (profileError || !profile) {
      console.error("❌ Profile lookup failed:", profileError)
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    let customerId = profile.stripe_customer_id

    // If somehow missing, create Stripe customer
    if (!customerId) {
      console.log("⚠ No Stripe customer found, creating one...")

      const customer = await stripe.customers.create({
        email: profile.email ?? undefined,
        metadata: {
          user_id: userId,
        },
      })

      customerId = customer.id

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId)

      console.log("✅ Stripe customer created:", customerId)
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId, // 🔥 THIS FIXES YOUR ISSUE
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: "https://stripe.com",
      cancel_url: "https://stripe.com",
      metadata: {
        type: "boost_pack",
        user_id: userId,
        package_id: packageId,
      },
    })

    console.log("✅ Stripe session created:", session.id)

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (error: any) {
    console.error("❌ Checkout creation failed:", error)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
})