import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js"

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  // 🔥 Get all profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")

  // 🔥 Get listing counts (ONLY VALID ONES)
  const { data: listings } = await supabase
    .from("listings")
    .select("user_id")
    .eq("is_sold", false) // 🔥 adjust if needed

  const listingCounts: Record<string, number> = {}

  listings?.forEach((l) => {
    listingCounts[l.user_id] =
      (listingCounts[l.user_id] || 0) + 1
  })

  const result = profiles.map((p) => {
    const listingCount = listingCounts[p.id] || 0

    return {
      name: p.display_name || "User",
      listings: listingCount,
      entries: 1 + listingCount * 5,
    }
  })

  return new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
})