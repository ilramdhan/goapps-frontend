// PPC common helpers + status tokens + label maps.
import { describe, it, expect } from "vitest"
import {
  humanizeEnumValue,
  currentMonth,
  todayIso,
  demandStatusToken,
  planItemStatusToken,
  woStatusToken,
  AREA_LABELS,
  DEMAND_STATUS_LABELS,
  WO_STATUS_OPTIONS,
  ACTIVE_FILTER_OPTIONS,
} from "@/types/ppc/common"
import { DemandStatus, PlanItemStatus, WOStatus, AreaCode } from "@/types/generated/ppc/v1/common"

describe("humanizeEnumValue", () => {
  it("title-cases ALL_CAPS snake enums", () => {
    expect(humanizeEnumValue("UNDER_REVIEW")).toBe("Under Review")
    expect(humanizeEnumValue("HIGH")).toBe("High")
    expect(humanizeEnumValue("PARAMETER_PENDING")).toBe("Parameter Pending")
  })
  it("handles empty input", () => {
    expect(humanizeEnumValue("")).toBe("")
  })
})

describe("date helpers", () => {
  it("currentMonth returns YYYY-MM", () => {
    expect(currentMonth()).toMatch(/^\d{4}-\d{2}$/)
  })
  it("todayIso returns YYYY-MM-DD", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe("status tokens", () => {
  it("maps demand status enum to registry token", () => {
    expect(demandStatusToken(DemandStatus.DEMAND_STATUS_PENDING_CONFIRMATION)).toBe("PENDING_CONFIRMATION")
    expect(demandStatusToken(DemandStatus.DEMAND_STATUS_FULFILLED)).toBe("FULFILLED")
  })
  it("maps plan item status", () => {
    expect(planItemStatusToken(PlanItemStatus.PLAN_ITEM_STATUS_IN_PRODUCTION)).toBe("IN_PRODUCTION")
  })
  it("maps WO status incl. sequential PC_APPROVED", () => {
    expect(woStatusToken(WOStatus.WO_STATUS_PC_APPROVED)).toBe("PC_APPROVED")
    expect(woStatusToken(WOStatus.WO_STATUS_REJECTED)).toBe("REJECTED")
  })
  it("returns empty string for unknown", () => {
    expect(woStatusToken(999 as WOStatus)).toBe("")
  })
})

describe("label maps + options", () => {
  it("area labels cover all areas", () => {
    expect(AREA_LABELS[AreaCode.AREA_CODE_TXT]).toBe("TXT")
    expect(AREA_LABELS[AreaCode.AREA_CODE_SPG]).toBe("SPG")
    expect(AREA_LABELS[AreaCode.AREA_CODE_TWT]).toBe("TWT")
  })
  it("demand status labels are human readable", () => {
    expect(DEMAND_STATUS_LABELS[DemandStatus.DEMAND_STATUS_PENDING_CONFIRMATION]).toBe("Pending Confirmation")
  })
  it("option arrays are non-empty and shaped {value,label}", () => {
    expect(WO_STATUS_OPTIONS.length).toBeGreaterThan(0)
    expect(WO_STATUS_OPTIONS[0]).toHaveProperty("value")
    expect(WO_STATUS_OPTIONS[0]).toHaveProperty("label")
    expect(ACTIVE_FILTER_OPTIONS).toHaveLength(3)
  })
})
