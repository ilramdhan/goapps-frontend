import { describe, it, expect } from "vitest"
import { secureUid } from "./uid"

describe("secureUid", () => {
  it("returns unique uuid-shaped strings", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => secureUid()))
    expect(ids.size).toBe(1000)
    expect([...ids][0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})
