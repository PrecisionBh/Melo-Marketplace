import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

function detectCarrier(tracking: string) {
  if (!tracking) return null
  if (tracking.startsWith("1Z")) return "ups"
  if (/^\d{12,14}$/.test(tracking)) return "fedex"
  if (/^\d{20,22}$/.test(tracking)) return "usps"
  return null
}

serve(async () => {
  try {
    console.log("➡️ Running tracking updater...")

    // 🔍 Get active shipments only
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, tracking_number, tracking_status, delivered_at, status")
      .not("tracking_number", "is", null)
      .neq("tracking_status", "delivered")
      .neq("status", "completed")

    if (error) throw error

    if (!orders || orders.length === 0) {
      console.log("No active shipments found")
      return new Response(JSON.stringify({ success: true }))
    }

    console.log(`Found ${orders.length} shipments to check`)

    for (const order of orders) {
      try {
        if (!order.tracking_number) continue

        const carrier = detectCarrier(order.tracking_number)

        if (!carrier) {
          console.log(`⚠️ Could not detect carrier for ${order.id}`)
          continue
        }

        console.log(`📦 Checking ${carrier} tracking for order ${order.id}`)

        const res = await fetch(
          `https://api.goshippo.com/tracks/${carrier}/${order.tracking_number}`,
          {
            headers: {
              Authorization: `ShippoToken ${Deno.env.get("SHIPPO_API_KEY")}`,
            },
          }
        )

        if (!res.ok) {
          console.log(`❌ Shippo error for ${order.id}`)
          continue
        }

        const tracking = await res.json()

        const status =
          tracking?.tracking_status?.status?.toLowerCase() || null

        if (!status) {
          console.log(`⚠️ No status returned for ${order.id}`)
          continue
        }

        console.log(`📊 Status for ${order.id}: ${status}`)

        // 🔄 Update tracking status
        await supabase
          .from("orders")
          .update({
            tracking_status: status,
            tracking_last_updated: new Date().toISOString(),
          })
          .eq("id", order.id)

        // 🚨 DELIVERY TRIGGER (ONLY ONCE)
        if (status === "delivered" && !order.delivered_at) {
          console.log(`🎉 Delivered detected for ${order.id}`)

          const now = new Date()
          const releaseDate = new Date(
            now.getTime() + 2 * 24 * 60 * 60 * 1000
          )

          await supabase
            .from("orders")
            .update({
              delivered_at: now.toISOString(),
              escrow_release_at: releaseDate.toISOString(),
              escrow_status: "processing",
            })
            .eq("id", order.id)
        }
      } catch (err) {
        console.error(`🔥 Error processing order ${order.id}`, err)
      }
    }

    return new Response(JSON.stringify({ success: true }))
  } catch (err: any) {
    console.error("❌ Fatal error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    })
  }
})