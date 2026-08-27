// R19-A diagnosability fix (helper for request-unlock/route.ts).
//
// A non-gRPC exception (client construction failure, a malformed request body, an
// unhandled JS error inside the client plumbing, …) used to be replaced UNCONDITIONALLY
// by a generic "Failed to request MB head unlock" string in the BFF route — the real
// `error.message` was only ever `console.error`'d server-side and never reached the
// toast. That makes every non-gRPC failure indistinguishable to the user and to whoever
// reads the bug report afterwards.
//
// ⛔ We must NOT forward the message verbatim either: a raw connection error can contain
// a DB/host connection string, and some infra errors carry credentials or stack frames.
// `safeUnlockErrorMessage` keeps only a short, scrubbed one-line summary and falls back
// to the generic string whenever the real message doesn't look safe to show.
//
// 🔴 NEW PATTERN — not used elsewhere in the repo yet. Every other BFF route's catch-all
// still discards non-gRPC error text outright (see the sibling approve/, grant-unlock/,
// reject-unlock/, validate/ routes under this same [mbhId]/ directory). This helper is
// deliberately kept in its own module (not exported from route.ts) — Next.js route files
// only permit HTTP-method and route-config exports, so a general-purpose helper needs to
// live next to it rather than inside it. It is scoped to this one route only, per the
// R19-A instruction to touch just the reported route rather than all 17 at once.
export function safeUnlockErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof Error) || !error.message) return fallback

    let msg = error.message

    // Strip anything shaped like a connection string / URL with embedded credentials,
    // e.g. "postgres://user:pass@host:5432/db" or "amqp://guest:guest@host".
    if (/[a-z][a-z0-9+.-]*:\/\//i.test(msg)) return fallback

    // Strip anything that looks like it's carrying a secret value.
    if (/(password|passwd|secret|token|api[_-]?key|credential)\s*[:=]/i.test(msg)) return fallback

    // A stack trace leaking into `.message` (rare, but some libs do this) always has a
    // newline + "at " frame — bail out rather than trying to trim it down.
    if (msg.includes("\n") || /\bat\s+\S+\s*\(/.test(msg)) return fallback

    // Keep it short — this is a toast, not a log line.
    const MAX_LEN = 200
    if (msg.length > MAX_LEN) msg = msg.slice(0, MAX_LEN) + "…"

    return `${fallback}: ${msg}`
}
