// lib/contentFilter.ts

const normalize = (text: string) => {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[@]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1!]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[$]/g, "s")
}

export const containsBlockedContent = (text: string) => {
  if (!text) return false

  const lower = text.toLowerCase()
  const normalized = normalize(text)

  /* ---------------- PAYMENT METHODS ---------------- */
  const paymentPatterns = [
    /\b(zelle|venmo|cash\s?app|cashapp|paypal|apple\s?pay|google\s?pay|chime|wise|western\s?union|moneygram|wire\s?transfer|bank\s?transfer)\b/i,
    /\b(bitcoin|btc|ethereum|eth|usdt|crypto)\b/i,
    /\b(gift\s?card|prepaid\s?card)\b/i,
  ]

  /* ---------------- CONTACT INTENT ---------------- */
  const contactPatterns = [
    /\b(text\s?me|call\s?me|dm\s?me|contact\s?me|reach\s?me|hit\s?me\s?up)\b/i,
  ]

  /* ---------------- EMAIL ---------------- */
  const emailPatterns = [
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    /(gmail\s?dot\s?com|yahoo\s?dot\s?com|outlook\s?dot\s?com|icloud\s?dot\s?com)/i,
  ]

  /* ---------------- PHONE ---------------- */
  const phonePatterns = [
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
    /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/,
  ]

  /* ---------------- SOCIAL ---------------- */
  const socialPatterns = [
    /\b(instagram|ig:|snapchat|snap:|telegram|whatsapp|discord|facebook|fb:)\b/i,
  ]

  /* ---------------- WEBSITE / LINKS ---------------- */
  const urlPatterns = [
    /\bhttps?:\/\/[^\s]+/i,             // full URLs
    /\bwww\.[^\s]+/i,                  // www links
    /\b[a-z0-9.-]+\.(com|net|org|io|co|me|app|shop|xyz)\b/i, // domains
    /(paypal\.me|cash\.app|venmo\.com)/i // payment links
  ]

  /* ---------------- LINK PHRASES ---------------- */
  const linkPhrases = [
    /\b(link in bio|check my site|visit my page|my website)\b/i
  ]

  /* ---------------- SNEAKY ---------------- */
  const sneakyKeywords = [
    "venmo",
    "zelle",
    "cashapp",
    "paypal",
    "applepay",
    "googlepay",
    "btc",
    "crypto",
  ]

  const patternMatch =
    paymentPatterns.some(p => p.test(lower)) ||
    contactPatterns.some(p => p.test(lower)) ||
    emailPatterns.some(p => p.test(lower)) ||
    phonePatterns.some(p => p.test(lower)) ||
    socialPatterns.some(p => p.test(lower)) ||
    urlPatterns.some(p => p.test(lower)) ||
    linkPhrases.some(p => p.test(lower))

  const sneakyMatch = sneakyKeywords.some(word =>
    normalized.includes(word)
  )

  return patternMatch || sneakyMatch
}

/* ---------------- REASON ---------------- */

export const getBlockedReason = (text: string): string | null => {
  const lower = text.toLowerCase()

  if (/(zelle|venmo|cash\s?app|paypal)/i.test(lower)) {
    return "External payments are not allowed."
  }

  if (/(https?:\/\/|www\.|\.(com|net|org|io|co|me))/i.test(lower)) {
    return "Sharing links or websites is not allowed."
  }

  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) {
    return "Email addresses are not allowed."
  }

  if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) {
    return "Phone numbers are not allowed."
  }

  if (/(instagram|snapchat|telegram|whatsapp|discord)/i.test(lower)) {
    return "Moving off-platform is not allowed."
  }

  return "This message contains prohibited content."
}