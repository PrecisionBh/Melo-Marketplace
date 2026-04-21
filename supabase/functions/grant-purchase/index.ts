import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

/* ---------------- BOOST PACK ---------------- */
async function fulfillBoostPack(userId: string, productId: string) {
  console.log("🚀 RevenueCat Boost Pack", { userId, productId })

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("boosts_remaining, mega_boosts_remaining")
    .eq("id", userId)
    .single()

  if (error || !profile) {
    console.error("❌ Profile fetch failed", error)
    return json(500, { error: "Profile not found" })
  }

  let boosts = profile.boosts_remaining ?? 0
  let mega = profile.mega_boosts_remaining ?? 0

  switch (productId) {
    case "boost_pack_3":
      boosts += 3
      break
    case "boost_pack_10":
      boosts += 10
      break
    case "boost_pack_25":
      boosts += 25
      break
    case "mega_boost_1":
      mega += 1
      break
    case "mega_boost_3":
      mega += 3
      break
    case "mega_boost_8":
      mega += 8
      break
    default:
      return json(400, { error: "Invalid product" })
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      boosts_remaining: boosts,
      mega_boosts_remaining: mega,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (updateError) {
    console.error("❌ Boost update failed", updateError)
    return json(500, { error: "Update failed" })
  }

  console.log("✅ Boost granted", { userId, boosts, mega })

  // 🔔 Notification added
  await supabase.functions.invoke("send-notification", {
    body: {
      userId,
      type: "boost",
      title: "Boosts Added 🚀",
      body: "Your boost credits have been added to your account.",
      data: { route: "/profile" },
      dedupeKey: `boost-${Date.now()}`
    }
  })

  return json(200, { success: true })
}

/* ---------------- PRO SUBSCRIPTION ---------------- */
async function activateMeloPro(userId: string) {
  console.log("👑 RevenueCat Pro activation", userId)

  const now = new Date()
  const nowIso = now.toISOString()

  const nextMonth = new Date(now)
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "boosts_remaining, mega_boosts_remaining, pro_activated_at"
    )
    .eq("id", userId)
    .single()

  if (error || !profile) {
    console.error("❌ Profile fetch failed", error)
    return json(500, { error: "Profile not found" })
  }

  const isFirstActivation = !profile.pro_activated_at

  const boosts = profile.boosts_remaining ?? 0
  const mega = profile.mega_boosts_remaining ?? 0

  const newBoosts = boosts + (isFirstActivation ? 5 : 0)
  const newMega = mega + (isFirstActivation ? 1 : 0)

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      is_pro: true,
      boosts_remaining: newBoosts,
      mega_boosts_remaining: newMega,
      pro_activated_at: profile.pro_activated_at || nowIso,
      pro_expires_at: nextMonth.toISOString(),
      updated_at: nowIso,
    })
    .eq("id", userId)

  if (updateError) {
    console.error("❌ Pro activation failed", updateError)
    return json(500, { error: "Activation failed" })
  }

  console.log("✅ Pro activated", userId)

  // 🔔 Notification added
  await supabase.functions.invoke("send-notification", {
    body: {
      userId,
      type: "pro",
      title: "Melo Pro Activated 👑",
      body: "You now have Pro benefits and bonus boosts!",
      data: { route: "/profile" },
      dedupeKey: `pro-${userId}-${Date.now()}`
    }
  })

  return json(200, { success: true })
}

/* ---------------- MAIN HANDLER ---------------- */
serve(async (req) => {
  try {
    const { productId, customerInfo } = await req.json()

    if (!productId || !customerInfo) {
      return json(400, { error: "Missing data" })
    }

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return json(401, { error: "Unauthorized" })

    const token = authHeader.replace("Bearer ", "")

    const {
      data: { user },
    } = await supabase.auth.getUser(token)

    if (!user) return json(401, { error: "Invalid user" })

    const userId = user.id

    /* ---------------- VERIFY ---------------- */

    const purchasedIds =
      customerInfo?.allPurchasedProductIdentifiers || []

    const transactions =
      customerInfo?.nonSubscriptionTransactions || []

    const hasPurchase =
      purchasedIds.includes(productId) ||
      transactions.some(
        (t: any) =>
          t.productId === productId ||
          t.productIdentifier === productId
      )

    const isPro =
      customerInfo?.entitlements?.active?.["melo_marketplace_pro"]

    if (productId === "melo_pro_subscription") {
      if (!isPro) {
        return json(403, { error: "No active subscription" })
      }

      return await activateMeloPro(userId)
    }

    if (!hasPurchase) {
      return json(403, { error: "Invalid purchase" })
    }

    return await fulfillBoostPack(userId, productId)
  } catch (err) {
    console.error("❌ grant-purchase error:", err)
    return json(500, { error: "Server error" })
  }
})