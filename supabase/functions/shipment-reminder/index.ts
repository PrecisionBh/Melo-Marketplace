/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

Deno.serve(async () => {
  try {
    console.log("🚀 Running shipment reminder job")

    const now = new Date()

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, seller_id, created_at, tracking_status, status")
      .eq("status", "paid")

    if (error) throw error

    for (const order of orders || []) {
      // Skip shipped orders
      if (
        order.tracking_status === "in_transit" ||
        order.tracking_status === "delivered"
      ) continue

      const created = new Date(order.created_at)
      const hoursSince =
        (now.getTime() - created.getTime()) / (1000 * 60 * 60)

      let stage: 24 | 48 | 72 | null = null

      // 🔥 Only fire within a window (prevents repeat spam)
      if (hoursSince >= 24 && hoursSince < 48) stage = 24
      else if (hoursSince >= 48 && hoursSince < 72) stage = 48
      else if (hoursSince >= 72 && hoursSince < 96) stage = 72

      if (!stage) continue

      console.log(`⏱ Order ${order.id} hit ${stage}h window`)

      let title = ""
      let body = ""

      if (stage === 24) {
        title = "Reminder: Ship Your Order 📦"
        body = "You have an order that needs to be shipped."
      }

      if (stage === 48) {
        title = "Second Reminder: Ship Your Order ⚠️"
        body = "This order is still waiting to be shipped."
      }

      if (stage === 72) {
        title = "Final Reminder: Ship Immediately 🚨"
        body = "Final notice — ship this order to avoid issues."
      }

      try {
        await supabase.functions.invoke("send-notification", {
          body: {
            userId: order.seller_id,
            type: "order_action",
            title,
            body,
            data: {
              route: "/orders/[id]",
              params: { id: order.id },
            },
            dedupeKey: `ship-reminder-${stage}-${order.id}`,
            email: true,
          },
        })

        console.log(`✅ Reminder sent (${stage}h) for ${order.id}`)
      } catch (err) {
        console.log("⚠️ Failed sending reminder:", err)
      }
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error("💥 shipment reminder error:", err)
    return new Response("Error", { status: 500 })
  }
})