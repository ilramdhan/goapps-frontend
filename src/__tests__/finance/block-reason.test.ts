import { describe, it, expect } from "vitest"
import { blockReasonLabel } from "@/lib/finance/block-reason"

describe("blockReasonLabel", () => {
  it("labels MISSING_SUPERBA_COST", () => {
    expect(blockReasonLabel("MISSING_SUPERBA_COST")).toBe("Superba cost not found for product shade code")
  })
  it("keeps detail when embedded in a longer message", () => {
    expect(blockReasonLabel("MISSING_SUPERBA_COST: MC-0547")).toBe("Superba cost not found for product shade code (MC-0547)")
  })
  it("passes unknown reasons through", () => {
    expect(blockReasonLabel("MISSING_RM_COST")).toBe("MISSING_RM_COST")
    expect(blockReasonLabel("")).toBe("")
  })
})
