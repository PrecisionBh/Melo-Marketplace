/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EASYPOST_API_KEY =
  Deno.env.get("EASYPOST_API_KEY")!

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL")!

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

serve(async (req) => {
  try {
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    )

    const {
      orderId,
      carrier,
      trackingNumber,
      userId,
    } = await req.json()

    if (
      !orderId ||
      !carrier ||
      !trackingNumber ||
      !userId
    ) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
        }),
        { status: 400 }
      )
    }

    /* ------------------------------------ */
    /* LOAD ORDER                           */
    /* ------------------------------------ */

    const { data: order, error: loadError } =
      await supabase
        .from("orders")
        .select(`
          id,
          buyer_id,
          seller_id,
          status,
          return_tracking_number
        `)
        .eq("id", orderId)
        .single()

    if (loadError || !order) {
      return new Response(
        JSON.stringify({
          error: "Order not found",
        }),
        { status: 404 }
      )
    }

    /* ------------------------------------ */
    /* SECURITY CHECKS                      */
    /* ------------------------------------ */

    if (order.buyer_id !== userId) {
      return new Response(
        JSON.stringify({
          error:
            "Only buyer may upload return tracking",
        }),
        { status: 403 }
      )
    }

    if (
      order.status !== "return_started" &&
      order.status !== "return_processing"
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Return is not active for this order",
        }),
        { status: 400 }
      )
    }

    if (order.return_tracking_number) {
      return new Response(
        JSON.stringify({
          error:
            "Return tracking already submitted",
        }),
        { status: 400 }
      )
    }

    /* ------------------------------------ */
    /* CREATE EASYPOST TRACKER              */
    /* ------------------------------------ */

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
            tracking_code:
              trackingNumber.trim(),
            carrier,
          },
        }),
      }
    )

    const tracker =
      await trackerRes.json()

    if (!tracker.id) {
      console.error(
        "EasyPost Error:",
        tracker
      )

      return new Response(
        JSON.stringify({
          error:
            "Failed to create EasyPost return tracker",
        }),
        { status: 400 }
      )
    }

    /* ------------------------------------ */
    /* UPDATE ORDER                         */
    /* ------------------------------------ */

    const { error: updateError } =
  await supabase
    .from("orders")
    .update({
      return_carrier: carrier,
      return_tracking_number:
        trackingNumber.trim(),
      return_tracking_url:
        tracker.public_url,

      return_easypost_tracker_id:
        tracker.id,

      return_tracking_status:
        tracker.status,

      return_shipped_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", orderId)

    if (updateError) throw updateError

    /* ------------------------------------ */
    /* NOTIFY SELLER                        */
    /* ------------------------------------ */

    try {
      await supabase.functions.invoke(
        "send-notification",
        {
          body: {
            userId: order.seller_id,
            type: "order",
            title: "Return Shipped",
            body:
              "Buyer uploaded return tracking.",
            data: {
              route:
                "/seller-hub/orders/[id]",
              params: {
                id: orderId,
              },
            },
            dedupeKey: `return-tracking-${orderId}`,
          },
        }
      )
    } catch (notifyErr) {
      console.error(
        "Notification failed:",
        notifyErr
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        tracker,
      }),
      { status: 200 }
    )
  } catch (err: any) {
    console.error(
      "RETURN TRACKER ERROR:",
      err
    )

    return new Response(
      JSON.stringify({
        error:
          err.message ||
          "Unknown error",
      }),
      { status: 500 }
    )
  }
})