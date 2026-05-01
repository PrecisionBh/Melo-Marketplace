import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    console.log("🔥 AI FUNCTION HIT")

    const { imageUrl } = await req.json()
    console.log("🖼 Incoming imageUrl:", imageUrl)

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
Analyze this product image and generate a marketplace listing.

Return ONLY JSON in this format:
{
  "title": string,
  "description": string,
  "category": string,
  "price": number
}

IMPORTANT:
You MUST choose ONE of these exact categories:
- electronics
- clothing_apparel
- jewelry_watches
- home_garden
- sports_outdoors
- collectibles
- automotive
- toys_games
- baby_kids
- beauty_health
- tools
- music_instruments
- pet_supplies
- books_media
- office_supplies
- art_handmade
- other

Rules:
- NEVER leave fields empty
- If unsure, make a best guess
- Title should look like a real resale listing
- Description should be short (1–2 sentences)
- Price = realistic used price (NOT retail)

Return ONLY JSON.
                `,
              },
              {
                type: "input_image",
                image_url: imageUrl,
              },
            ],
          },
        ],
      }),
    })

    const data = await res.json()
    console.log("📦 OPENAI RAW RESPONSE:", JSON.stringify(data))

    // 🔥 EXTRACT TEXT SAFELY
    let text =
      data?.output_text ||
      data?.output?.[0]?.content?.find((c: any) => c.type === "output_text")?.text

    console.log("🧠 AI TEXT OUTPUT:", text)

    if (!text) {
      console.log("❌ NO TEXT FROM AI")

      return new Response(JSON.stringify({
        title: "Item for sale",
        description: "Good condition item.",
        category: "other",
        price: 20
      }), {
        headers: { "Content-Type": "application/json" }
      })
    }

    // 🔥 CLEAN ```json WRAPPER
    let cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim()

    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) cleaned = match[0]

    console.log("🧹 CLEANED TEXT:", cleaned)

    let parsed

    try {
      parsed = JSON.parse(cleaned)
    } catch (err) {
      console.log("❌ JSON PARSE FAILED:", err)

      parsed = {}
    }

    // 🔥 CATEGORY NORMALIZATION (FOR YOUR APP)
    const normalizeCategory = (cat: string) => {
      if (!cat) return "other"

      const c = cat.toLowerCase()

      if (c.includes("shoe") || c.includes("clothing") || c.includes("shirt") || c.includes("pants")) return "clothing_apparel"
      if (c.includes("watch") || c.includes("jewelry")) return "jewelry_watches"
      if (c.includes("electronic") || c.includes("phone") || c.includes("laptop")) return "electronics"
      if (c.includes("tool")) return "tools"
      if (c.includes("car") || c.includes("auto")) return "automotive"
      if (c.includes("toy") || c.includes("game")) return "toys_games"
      if (c.includes("baby")) return "baby_kids"
      if (c.includes("beauty") || c.includes("cosmetic")) return "beauty_health"
      if (c.includes("sport")) return "sports_outdoors"
      if (c.includes("pet")) return "pet_supplies"
      if (c.includes("book")) return "books_media"
      if (c.includes("music")) return "music_instruments"
      if (c.includes("art") || c.includes("handmade")) return "art_handmade"
      if (c.includes("office")) return "office_supplies"
      if (c.includes("home") || c.includes("garden")) return "home_garden"
      if (c.includes("collect")) return "collectibles"

      return "other"
    }

    // 🔥 FINAL SAFE OUTPUT (NO MORE EMPTY RESULTS)
    const finalResult = {
      title: parsed?.title || "Item for sale",
      description: parsed?.description || "Good condition item.",
      category: normalizeCategory(parsed?.category),
      price: parsed?.price || 20,
    }

    console.log("✅ FINAL PARSED RESULT:", finalResult)

    return new Response(JSON.stringify(finalResult), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("💥 AI FUNCTION CRASH:", err)

    return new Response(JSON.stringify({
      title: "Item for sale",
      description: "Good condition item.",
      category: "other",
      price: 20
    }), {
      headers: { "Content-Type": "application/json" }
    })
  }
})