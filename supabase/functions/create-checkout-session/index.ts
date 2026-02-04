/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno"

// ---------- ENV ----------
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY")
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL")
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

// ---------- CLIENTS ----------
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" })
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ---------- HELPERS ----------
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

const roundCents = (n: number) => Math.round(n * 100)

// 1.5% buyer protection + 2.9% processing + $0.30
const buyerFeeDollars = (price: number) => {
  const fee = price * 0.015 + price * 0.029 + 0.3
  return Math.max(0.5, +fee.toFixed(2)) // 🔒 enforce Stripe minimum
}

const isExpired = (iso: string, hours = 24) =>
  Date.now() > new Date(iso).getTime() + hours * 60 * 60 * 1000

// ---------- HANDLER ----------
serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json(405, { error: "Method not allowed" })
    }

    /* ---------- AUTH ---------- */
    const authHeader = req.headers.get("Authorization") ?? ""
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null

    if (!token) return json(401, { error: "Missing Authorization token" })

    const { data: authData, error: authErr } =
      await supabase.auth.getUser(token)

    if (authErr || !authData?.user)
      return json(401, { error: "Invalid user token" })

    const buyer = authData.user
    if (!buyer.email) return json(400, { error: "Missing buyer email" })

    /* ---------- BODY ---------- */
    const body = await req.json()
    const { listing_id, offer_id } = body

    let itemTitle = "Marketplace Item"
    let imageUrl: string | undefined
    let itemPrice = 0
    let shipping = 0
    let sellerId = ""

    /* ---------- OFFER CHECKOUT ---------- */
    if (offer_id) {
      const { data: offer, error } = await supabase
        .from("offers")
        .select(`
          id,
          buyer_id,
          seller_id,
          listing_id,
          status,
          created_at,
          accepted_price,
          accepted_shipping_type,
          accepted_shipping_price,
          accepted_title,
          accepted_image_url
        `)
        .eq("id", offer_id)
        .single()

      if (error || !offer)
        return json(404, { error: "Offer not found" })

      if (offer.buyer_id !== buyer.id)
        return json(403, { error: "Not your offer" })

      if (offer.status !== "accepted")
        return json(400, { error: "Offer not accepted" })

      if (isExpired(offer.created_at))
        return json(400, { error: "Offer expired" })

      itemPrice = Number(offer.accepted_price ?? 0)
      shipping =
        offer.accepted_shipping_type === "buyer_pays"
          ? Number(offer.accepted_shipping_price ?? 0)
          : 0

      itemTitle = offer.accepted_title ?? itemTitle
      imageUrl = offer.accepted_image_url ?? undefined
      sellerId = offer.seller_id
    }

    /* ---------- LISTING CHECKOUT ---------- */
    else if (listing_id) {
      const { data: listing, error } = await supabase
        .from("listings")
        .select(`
          id,
          title,
          price,
          image_urls,
          shipping_type,
          shipping_price,
          user_id,
          is_sold
        `)
        .eq("id", listing_id)
        .single()

      if (error || !listing)
        return json(404, { error: "Listing not found" })

      if (listing.is_sold)
        return json(400, { error: "Listing already sold" })

      itemPrice = Number(listing.price)
      shipping =
        listing.shipping_type === "buyer_pays"
          ? Number(listing.shipping_price ?? 0)
          : 0

      itemTitle = listing.title
      imageUrl = listing.image_urls?.[0]
      sellerId = listing.user_id
    } else {
      return json(400, { error: "listing_id or offer_id required" })
    }

    /* ---------- FEES ---------- */
    const buyerFee = buyerFeeDollars(itemPrice)

    /* ---------- STRIPE LINE ITEMS ---------- */
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: itemTitle,
            images: imageUrl ? [imageUrl] : undefined,
          },
          unit_amount: roundCents(itemPrice),
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Buyer Protection & Processing Fee",
          },
          unit_amount: roundCents(buyerFee),
        },
        quantity: 1,
      },
    ]

    if (shipping > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Shipping",
          },
          unit_amount: roundCents(shipping),
        },
        quantity: 1,
      })
    }

    /* ---------- STRIPE SESSION ---------- */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: buyer.email,
      payment_method_types: ["card"],
      line_items: lineItems,

      metadata: {
        buyer_id: buyer.id,
        seller_id: sellerId,
        listing_id: listing_id ?? "",
        offer_id: offer_id ?? "",
      },

      success_url: "melomp://checkout/success",
      cancel_url: "melomp://checkout/cancel",
    })

    return json(200, { url: session.url })
  } catch (err: any) {
    console.error("❌ checkout fatal error:", err)
    return json(400, { error: err?.message ?? "Checkout failed" })
  }
})
