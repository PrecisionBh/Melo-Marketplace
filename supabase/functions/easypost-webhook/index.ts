/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

function mapStatus(status: string) {
  const s = status?.toLowerCase()?.trim()

  if (s === "pre_transit") return "label_created"

  if (
    s === "in_transit" ||
    s === "out_for_delivery" ||
    s === "available_for_pickup"
  ) {
    return "in_transit"
  }

  if (s === "delivered") return "delivered"

  if (
    s === "failure" ||
    s === "return_to_sender" ||
    s === "cancelled"
  ) {
    return "exception"
  }

  return "label_created"
}

serve(async (req) => {
  try {
    const payload = await req.json()

    console.log("📦 EasyPost webhook payload:", payload)

    const tracker =
      payload?.result ||
      payload?.tracker ||
      payload?.data?.object

    if (!tracker?.tracking_code) {
      return new Response("No tracker", { status: 200 })
    }

    const trackingCode = tracker.tracking_code
    const trackerId = tracker.id
    const newStatus = mapStatus(tracker.status)

    const { data: matchedOrders } = await supabase
      .from("orders")
      .select("*")
      .or(
        `easypost_tracker_id.eq.${trackerId},tracking_number.eq.${trackingCode}`
      )

    let isReturn = false
    let orders = matchedOrders || []

    if (!orders.length) {
      const { data: returnOrders } = await supabase
        .from("orders")
        .select("*")
        .or(
          `return_easypost_tracker_id.eq.${trackerId},return_tracking_number.eq.${trackingCode}`
        )

      if (returnOrders?.length) {
        orders = returnOrders
        isReturn = true
      }
    }

    if (!orders.length) {
      console.log("⚠️ No matching order found")
      return new Response("No order match", { status: 200 })
    }

    // ----------------------------------
    // RETURN FLOW
    // ----------------------------------
    if (isReturn) {
      for (const order of orders) {
        const updateData: any = {
          return_tracking_status: newStatus,
          updated_at: new Date().toISOString(),
        }

        if (
          newStatus === "delivered" &&
          !order.return_delivered_at
        ) {
          const now = new Date()

          updateData.return_received = true
          updateData.return_delivered_at =
            now.toISOString()

          updateData.return_refund_at = new Date(
            now.getTime() + 2 * 24 * 60 * 60 * 1000
          ).toISOString()

          // 🔔 SELLER: return delivered
          await supabase.functions.invoke("send-notification", {
            body: {
              userId: order.seller_id,
              type: "order",
              title: "Return Delivered 📦",
              body: "The returned item has been delivered to you.",
              data: {
                route: "/orders/[id]",
                params: { id: order.id },
              },
              dedupeKey: `return-delivered-${order.id}`,
              email: true,
            },
          })
        }

        if (newStatus === "in_transit") {
          // 🔔 SELLER: return in transit
          await supabase.functions.invoke("send-notification", {
            body: {
              userId: order.seller_id,
              type: "order",
              title: "Return In Transit 🔁",
              body: "The buyer has shipped the return.",
              data: {
                route: "/orders/[id]",
                params: { id: order.id },
              },
              dedupeKey: `return-transit-${order.id}`,
              email: true,
            },
          })
        }

        await supabase
          .from("orders")
          .update(updateData)
          .eq("id", order.id)
      }

      return new Response("Return updated", {
        status: 200,
      })
    }

    // ----------------------------------
    // FORWARD SHIPMENT FLOW
    // ----------------------------------
    for (const order of orders) {
      const updateData: any = {
        tracking_status: newStatus,
        updated_at: new Date().toISOString(),
      }

      if (
        newStatus === "delivered" &&
        !order.delivered_at
      ) {
        const now = new Date()

        updateData.delivered_at =
          now.toISOString()

        updateData.escrow_release_at =
          new Date(
            now.getTime() +
              2 * 24 * 60 * 60 * 1000
          ).toISOString()

        // 🔔 BUYER: delivered
        await supabase.functions.invoke("send-notification", {
          body: {
            userId: order.buyer_id,
            type: "order",
            title: "Package Delivered 📦",
            body: "Your order has been delivered.",
            data: {
              route: "/orders/[id]",
              params: { id: order.id },
            },
            dedupeKey: `delivered-${order.id}`,
            email: true,
          },
        })
      }

      if (newStatus === "in_transit") {
        // 🔔 BUYER: in transit
        await supabase.functions.invoke("send-notification", {
          body: {
            userId: order.buyer_id,
            type: "order",
            title: "Package On The Way 🚚",
            body: "Your order is on the way.",
            data: {
              route: "/orders/[id]",
              params: { id: order.id },
            },
            dedupeKey: `in-transit-${order.id}`,
            email: true,
          },
        })
      }

      await supabase
        .from("orders")
        .update(updateData)
        .eq("id", order.id)
    }

    return new Response("Shipment updated", {
      status: 200,
    })
  } catch (err) {
    console.log("❌ Webhook Error:", err)

    return new Response("Webhook failed", {
      status: 500,
    })
  }
})