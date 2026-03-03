/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

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
    const { userId, packageId } = await req.json()

    if (!userId || !packageId) {
      return new Response(
        JSON.stringify({ error: "Missing userId or packageId" }),
        { status: 400 }
      )
    }

    const priceId = PRICE_MAP[packageId]

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Invalid packageId" }),
        { status: 400 }
      )
    }

    // Optional: Verify user exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single()

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404 }
      )
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${Deno.env.get("SITE_URL")}/boost-success`,
      cancel_url: `${Deno.env.get("SITE_URL")}/boost-cancel`,
      metadata: {
        user_id: userId,
        package_id: packageId,
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200 }
    )
  } catch (error: any) {
    console.error("❌ Checkout creation failed:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})