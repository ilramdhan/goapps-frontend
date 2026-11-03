/**
 * Cryptographically-backed unique id for client-side UI identifiers
 * (React keys, graph node ids). Uses crypto.randomUUID() and falls back to
 * crypto.getRandomValues() — never Math.random().
 */
export function secureUid(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined
  if (c && typeof c.randomUUID === "function") return c.randomUUID()
  const bytes = new Uint8Array(16)
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes)
  } else {
    throw new Error("Web Crypto is not available")
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
