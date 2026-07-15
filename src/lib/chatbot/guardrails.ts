// Server-side only — never import from client components.
// Layered guardrails for the AI chatbot:
//   Layer 1: rate limit (Redis, enforced in the BFF route)
//   Layer 2: daily token budget (Redis, enforced in the BFF route)
//   Layer 3: prompt injection / jailbreak pattern filter (this file)

export interface GuardrailResult {
  blocked: boolean
  reason?: string
}

interface GuardrailOptions {
  message: string
  userId: string
  skipRateLimit?: boolean // test-only
}

// Prompt injection / jailbreak patterns (Layer 3)
export const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /pretend\s+(you\s+are|to\s+be)\s+(DAN|a\s+different|an?\s+AI)/i,
  /\bDAN\b.*no\s+restrictions/i,
  /system\s+prompt/i,
  /you\s+are\s+now\s+(in\s+)?developer\s+mode/i,
  /\[system\]/i,
  /\/\*.*override.*\*\//i,
  /forget\s+your\s+previous\s+instructions/i,
  /new\s+instructions:/i,
  /disregard\s+(all\s+)?previous/i,
]

export async function checkGuardrails(opts: GuardrailOptions): Promise<GuardrailResult> {
  const { message } = opts

  // Layer 3: Prompt injection filter
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return { blocked: true, reason: "injection attempt detected" }
    }
  }

  // Layer 1: Rate limit — checked server-side via Redis in the BFF route
  // Layer 2: Daily token budget — checked server-side via Redis in the BFF route
  // These two layers are enforced in the BFF route.ts, not here, because
  // they require Redis access (server-side only).

  return { blocked: false }
}

// Redis-based rate limit check — call from BFF route only.
// Returns true if the request should be blocked.
export async function checkRateLimit(_userId: string, _redisUrl: string): Promise<boolean> {
  // Implementation: Redis INCR + EXPIRE on key `chatbot:rate:{userId}:{minute}`
  // Checked in BFF route using ioredis or @upstash/redis.
  // Placeholder — actual implementation lives in the BFF route.
  return false
}

export async function checkDailyTokenBudget(
  _userId: string,
  _dailyLimit: number,
): Promise<{ blocked: boolean; tokensUsed: number }> {
  // Implementation: Redis GET on key `chatbot:tokens:{userId}:{date}`
  // Placeholder — actual implementation lives in the BFF route.
  return { blocked: false, tokensUsed: 0 }
}
