import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

Deno.serve(async (req) => {
  const { order_id, buyer_id } = await req.json()

  if (!order_id || !buyer_id) {
    return new Response("Missing data", { status: 400 })
  }

  try {
    await supabase.from("notifications").insert({
      user_id: buyer_id,
      type: "order",
      title: "Reminder: Confirm Your Order 📦",
      body: "Your order will auto-complete tomorrow if no action is taken.",
      data: {
        route: "/orders/[id]",
        params: { id: order_id },
      },
    })

    const { data: profile } = await supabase
      .from("profiles")
      .select("expo_push_token, notifications_enabled")
      .eq("id", buyer_id)
      .single()

    if (
      profile?.expo_push_token &&
      profile.notifications_enabled !== false
    ) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: profile.expo_push_token,
          title: "Reminder: Confirm Your Order 📦",
          body: "Your order will auto-complete tomorrow if no action is taken.",
          data: {
            type: "order",
            route: "/orders/[id]",
            params: { id: order_id },
          },
        }),
      })
    }
  } catch (err) {
    console.error("Reminder notification failed:", err)
  }

  return Response.json({ success: true })
})
