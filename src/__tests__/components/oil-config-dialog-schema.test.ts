/**
 * OilConfigDialog — Zod validation for the oil class / allowed-groups form
 * (oil-cost-rm-group P5-T5, D10).
 *
 *  - When an oil class is set, exactly one allowed group must be default.
 *  - When no oil class is set, the allowed-groups list must be empty.
 */
import { describe, it, expect } from "vitest"
import { oilConfigFormSchema } from "@/components/finance/cost-product-type/oil-config-dialog"

describe("oilConfigFormSchema", () => {
  it("passes with an oil class and exactly one default group", () => {
    const result = oilConfigFormSchema.safeParse({
      oilClass: "PTY",
      groups: [
        { groupCode: "GRP-A", groupName: "Group A", isDefault: true },
        { groupCode: "GRP-B", groupName: "Group B", isDefault: false },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("fails when the oil class is set but no group is marked default", () => {
    const result = oilConfigFormSchema.safeParse({
      oilClass: "PTY",
      groups: [
        { groupCode: "GRP-A", groupName: "Group A", isDefault: false },
        { groupCode: "GRP-B", groupName: "Group B", isDefault: false },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("fails when the oil class is set but two groups are marked default", () => {
    const result = oilConfigFormSchema.safeParse({
      oilClass: "PTY",
      groups: [
        { groupCode: "GRP-A", groupName: "Group A", isDefault: true },
        { groupCode: "GRP-B", groupName: "Group B", isDefault: true },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("fails when the oil class is set but no groups are selected at all", () => {
    const result = oilConfigFormSchema.safeParse({ oilClass: "POY", groups: [] })
    expect(result.success).toBe(false)
  })

  it("passes with an empty oil class and no groups", () => {
    const result = oilConfigFormSchema.safeParse({ oilClass: "", groups: [] })
    expect(result.success).toBe(true)
  })

  it("fails when the oil class is empty but groups are still populated", () => {
    const result = oilConfigFormSchema.safeParse({
      oilClass: "",
      groups: [{ groupCode: "GRP-A", groupName: "Group A", isDefault: true }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects an oil class outside the known enum", () => {
    const result = oilConfigFormSchema.safeParse({ oilClass: "NOT_A_CLASS", groups: [] })
    expect(result.success).toBe(false)
  })
})
