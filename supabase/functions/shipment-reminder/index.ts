import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

Deno.serve(async (req) => {
  const { order_id, buyer_id } = await req.json()

  if (!order_id || !buyer_id) {
    return new Response("Missing data", { status: 400 })
  }

  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        userId: buyer_id,
        type: "order",
        title: "Reminder: Confirm Your Order 📦",
        body: "Your order will auto-complete tomorrow if no action is taken.",
        data: {
          route: `/buyer-hub/orders/${order_id}`,
        },
        dedupeKey: `confirm-reminder-${order_id}`, // 🔥 prevents spam
      }),
    })
  } catch (err) {
    console.log("⚠️ Reminder notification failed:", err)
  }

  return Response.json({ success: true })
})