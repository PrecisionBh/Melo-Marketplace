/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const EASYPOST_API_KEY = Deno.env.get("EASYPOST_API_KEY")!

// 🔥 Status mapping (UNCHANGED)
const mapStatus = (status: string) => {
  const s = status?.toLowerCase().trim()

  if (s === "pre_transit") return "label_created"

  if (
    s === "in_transit" ||
    s === "out_for_delivery" ||
    s === "available_for_pickup"
  ) return "in_transit"

  if (s === "delivered") return "delivered"

  if (
    s === "failure" ||
    s === "return_to_sender" ||
    s === "cancelled"
  ) return "exception"

  console.log("⚠️ UNKNOWN STATUS:", status)
  return "label_created"
}

// 🔔 Notification helper
const sendNotification = async ({
  userId,
  type,
  title,
  body,
  data = {},
}: {
  userId: string
  type: string
  title: string
  body: string
  data?: any
}) => {
  try {
    if (!userId) return

    await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      data,
    })

    const { data: profile } = await supabase
      .from("profiles")
      .select("expo_push_token, notifications_enabled")
      .eq("id", userId)
      .single()

    if (
      !profile?.expo_push_token ||
      profile.notifications_enabled === false
    ) {
      return
    }

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: profile.expo_push_token,
        title,
        body,
        data,
      }),
    })
  } catch (err) {
    console.log("⚠️ Notification error:", err)
  }
}

serve(async (req) => {
  try {
    console.log("🚀 check-tracking started")

    const body = await req.json().catch(() => null)
    const orderId = body?.orderId

    let orders: any[] = []

    if (orderId) {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single()

      if (error || !data) {
        console.log("❌ Order fetch error:", error)
        return new Response("Order not found", { status: 404 })
      }

      orders = [data]
    } else {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .not("tracking_number", "is", null)
        .neq("tracking_status", "delivered")

      if (error) {
        console.log("❌ FETCH ERROR:", error)
        return new Response("Fetch failed", { status: 500 })
      }

      orders = data || []
      console.log(`📦 Cron checking ${orders.length} orders`)
    }

    for (const order of orders) {
      try {
        if (!order.tracking_number) continue

        console.log("📦 Checking:", order.tracking_number)

        const res = await fetch("https://api.easypost.com/v2/trackers", {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(`${EASYPOST_API_KEY}:`),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tracker: {
              tracking_code: order.tracking_number,
            },
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          console.log("❌ EasyPost error:", data)
          continue
        }

        const tracker = data.tracker || data

        if (!tracker?.status) {
          console.log("⚠️ No status returned")
          continue
        }

        const easyPostStatus = tracker.status
        const newStatus = mapStatus(easyPostStatus)
        const oldStatus = order.tracking_status
        const publicUrl = tracker.public_url || null

        console.log("📦 EasyPost:", easyPostStatus, "→", newStatus)
        console.log("🔗 Public URL:", publicUrl)

        let deliveredAt = order.delivered_at
        let escrowReleaseAt = order.escrow_release_at

        if (newStatus === "delivered" && !order.delivered_at) {
          const now = new Date()

          deliveredAt = now.toISOString()
          escrowReleaseAt = new Date(
            now.getTime() + 2 * 24 * 60 * 60 * 1000
          ).toISOString()

          console.log("🎉 DELIVERY DETECTED → TIMER STARTED", order.id)
        }

        const updateData: any = {
          tracking_status: newStatus,
          delivered_at: deliveredAt,
          escrow_release_at: escrowReleaseAt,
          updated_at: new Date().toISOString(),
        }

        if (publicUrl && publicUrl !== order.tracking_url) {
          updateData.tracking_url = publicUrl
        }

        // 🔔 NOTIFICATIONS (ONLY ON STATUS CHANGE)
        if (oldStatus !== newStatus) {
          console.log("🔔 Status changed:", oldStatus, "→", newStatus)

          // 🟡 BUYER: LABEL CREATED
          if (newStatus === "label_created") {
            await sendNotification({
              userId: order.buyer_id,
              type: "order",
              title: "Shipping Label Created",
              body: "Your order is being prepared for shipment.",
              data: { orderId: order.id },
            })
          }

          // 🟠 OUT FOR DELIVERY (uses raw EasyPost status)
          if (easyPostStatus === "out_for_delivery") {
            await sendNotification({
              userId: order.buyer_id,
              type: "order",
              title: "Out for Delivery",
              body: "Your package is out for delivery today.",
              data: { orderId: order.id },
            })

            await sendNotification({
              userId: order.seller_id,
              type: "order",
              title: "Out for Delivery",
              body: "The package is out for delivery to the buyer.",
              data: { orderId: order.id },
            })
          }

          // 🔵 IN TRANSIT
          if (newStatus === "in_transit") {
            await sendNotification({
              userId: order.buyer_id,
              type: "order",
              title: "Order In Transit",
              body: "Your package is on the way.",
              data: { orderId: order.id },
            })

            await sendNotification({
              userId: order.seller_id,
              type: "order",
              title: "Package In Transit",
              body: "The buyer’s order is now in transit.",
              data: { orderId: order.id },
            })
          }

          // 🟢 DELIVERED
          if (newStatus === "delivered") {
            await sendNotification({
              userId: order.buyer_id,
              type: "order",
              title: "Order Delivered",
              body: "Your order has been delivered.",
              data: { orderId: order.id },
            })

            await sendNotification({
              userId: order.seller_id,
              type: "order",
              title: "Order Delivered",
              body: "The order has been delivered to the buyer.",
              data: { orderId: order.id },
            })
          }
        }

        await supabase
          .from("orders")
          .update(updateData)
          .eq("id", order.id)

      } catch (err) {
        console.log("❌ Order error:", order.id, err)
      }
    }

    return new Response("Done", { status: 200 })

  } catch (err) {
    console.log("❌ Fatal error:", err)
    return new Response("Server error", { status: 500 })
  }
})