/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const EASYPOST_API_KEY =
  Deno.env.get("EASYPOST_API_KEY")!

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

serve(async (req) => {
  try {
    const {
      orderId,
      carrier,
      trackingNumber,
    } = await req.json()

    if (!orderId || !carrier || !trackingNumber) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields.",
        }),
        { status: 400 }
      )
    }

    // -----------------------------
    // CREATE EASYPOST TRACKER
    // -----------------------------
    const trackerRes = await fetch(
      "https://api.easypost.com/v2/trackers",
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            btoa(`${EASYPOST_API_KEY}:`),
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          tracker: {
            tracking_code: trackingNumber,
            carrier,
          },
        }),
      }
    )

    const trackerData = await trackerRes.json()

    if (!trackerRes.ok) {
      console.log(
        "❌ EasyPost Error:",
        trackerData
      )

      return new Response(
        JSON.stringify({
          error:
            trackerData?.error?.message ??
            "Failed to create tracker.",
        }),
        { status: 400 }
      )
    }

    const tracker =
      trackerData.tracker || trackerData

    // -----------------------------
    // UPDATE ORDER
    // -----------------------------
    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .update({
          carrier,
          tracking_number:
            trackingNumber.trim(),
          tracking_url:
            tracker.public_url,
          easypost_tracker_id:
            tracker.id,
          tracking_status:
            tracker.status,
          status: "shipped",
          shipped_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", orderId)
        .select("*")
        .single()

    if (orderError) throw orderError

    // -----------------------------
    // SEND BUYER NOTIFICATION
    // -----------------------------
    try {
      await supabase.functions.invoke(
        "send-notification",
        {
          body: {
            userId: order.buyer_id,
            type: "order",
            title: "Order shipped",
            body:
              "Your order has been shipped. Tracking information is now available.",
            data: {
              route:
                "/orders/[id]",
              params: {
                id: order.id,
              },
            },
            dedupeKey: `order-shipped-${order.id}`,
            email: true,
          },
        }
      )
    } catch (notifyErr) {
      console.log(
        "⚠️ Notification failed:",
        notifyErr
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        trackerId: tracker.id,
      }),
      { status: 200 }
    )
  } catch (err) {
    console.log(
      "❌ create-easypost-tracker error:",
      err
    )

    return new Response(
      JSON.stringify({
        error:
          err instanceof Error
            ? err.message
            : "Unknown error",
      }),
      { status: 500 }
    )
  }
})