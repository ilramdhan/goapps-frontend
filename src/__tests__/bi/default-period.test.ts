import { describe, it, expect } from "vitest"
import { viewerDefaultPeriod } from "@/lib/bi/default-period"

describe("viewerDefaultPeriod", () => {
  it("uses the dashboard default when valid", () => {
    expect(viewerDefaultPeriod("THIS_MONTH", "L12M")).toBe("THIS_MONTH")
  })
  it("falls back to the global default for missing or invalid values", () => {
    expect(viewerDefaultPeriod(undefined, "L12M")).toBe("L12M")
    expect(viewerDefaultPeriod("", "L12M")).toBe("L12M")
    expect(viewerDefaultPeriod("bogus", "L12M")).toBe("L12M")
  })
})
