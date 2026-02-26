/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY")
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL")
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" })

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      })
    }

    // ✅ Require auth (secure like your other Melo functions)
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 🚨 CRITICAL FIX:
    // Stripe Billing Portal REQUIRES a valid HTTPS URL (NOT melomp://)
    // Do NOT use deep links here.
    const returnUrl = "https://stripe.com" // Safe MVP return (prevents url_invalid error)

    // 1) Resolve user from Supabase Auth using JWT
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    })

    if (!userRes.ok) {
      const txt = await userRes.text()
      return new Response(JSON.stringify({ error: "Invalid auth", detail: txt }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const user = await userRes.json()
    const userId = user?.id

    if (!userId) {
      return new Response(JSON.stringify({ error: "Could not resolve user" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 2) Fetch stripe_customer_id from profiles table (your Melo schema)
    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=stripe_customer_id`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
      }
    )

    if (!profRes.ok) {
      const txt = await profRes.text()
      return new Response(JSON.stringify({ error: "Failed to load profile", detail: txt }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const prof = await profRes.json()
    const customerId = prof?.[0]?.stripe_customer_id

    if (!customerId) {
      return new Response(JSON.stringify({ error: "No Stripe customer on account" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 3) Create Stripe Billing Portal Session (Cancel / Manage Subscription)
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl, // MUST be HTTPS (not deep link)
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: any) {
    console.error("❌ create-billing-portal-session error:", err)
    return new Response(JSON.stringify({ error: err?.message ?? "Portal failed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }
})