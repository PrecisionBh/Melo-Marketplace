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

serve(async () => {
  try {
    console.log("🚀 Starting tracker backfill")

    const { data: orders, error } =
      await supabase
        .from("orders")
        .select("*")
        .not("tracking_number", "is", null)
        .neq("tracking_status", "delivered")
        .is("easypost_tracker_id", null)

    if (error) throw error

    console.log(
      `📦 Found ${orders?.length || 0} orders to backfill`
    )

    for (const order of orders || []) {
      try {
        const res = await fetch(
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
                  order.tracking_number,
                carrier:
                  order.carrier || undefined,
              },
            }),
          }
        )

        const data = await res.json()

        if (!res.ok) {
          console.log(
            `❌ Failed tracker create for ${order.id}`,
            data
          )
          continue
        }

        const tracker =
          data.tracker || data

        await supabase
          .from("orders")
          .update({
            easypost_tracker_id:
              tracker.id,
            tracking_url:
              tracker.public_url,
            tracking_status:
              tracker.status,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", order.id)

        console.log(
          `✅ Backfilled ${order.id}`
        )
      } catch (err) {
        console.log(
          `❌ Error backfilling ${order.id}`,
          err
        )
      }
    }

    return new Response(
      "Backfill complete",
      { status: 200 }
    )
  } catch (err) {
    console.log("❌ Fatal:", err)

    return new Response(
      "Backfill failed",
      { status: 500 }
    )
  }
})