/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"

serve(async () => {
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: "ExponentPushToken[a667ieBGXzhS2gI5CcG58r]",
      title: "Melo Test",
      body: "This is a test notification",
    }),
  })

  return new Response("Sent", { status: 200 })
})
