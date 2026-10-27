import { describe, it, expect } from "vitest"
import { periodLabel } from "@/lib/bi/period"

describe("periodLabel", () => {
  it("formats YYYYMM monthly", () => {
    expect(periodLabel("202604", "MONTHLY")).toBe("Apr 2026")
  })
  it("keeps ISO week labels and derives them from dates", () => {
    expect(periodLabel("2026-W42", "WEEKLY")).toBe("2026-W42")
    expect(periodLabel("2026-10-15", "WEEKLY")).toBe("2026-W42")
    expect(periodLabel("2027-01-01", "WEEKLY")).toBe("2026-W53")
  })
  it("passes through quarterly/yearly", () => {
    expect(periodLabel("2026-Q2", "QUARTERLY")).toBe("2026-Q2")
    expect(periodLabel("2026", "YEARLY")).toBe("2026")
  })
})
