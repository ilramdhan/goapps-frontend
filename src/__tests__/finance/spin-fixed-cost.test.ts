// Spin Fixed Cost — pure helpers, response parsers, and RBAC permission codes.
//
// Domain: ONE row per period (YYYYMM) holding the monthly POY spinning
// fixed-cost pool that the calc engine divides across ~4,003 POY products.
import { describe, it, expect } from "vitest"

import {
  PERIOD_PATTERN,
  formatPeriod,
  periodToMonthInput,
  monthInputToPeriod,
  formatNumeric,
  DEFAULT_SPIN_FIXED_COST_FORM_VALUES,
  SpinFixedCostParser,
  ListSpinFixedCostsResponseParser,
  CreateSpinFixedCostResponseParser,
} from "@/types/finance/spin-fixed-cost"
import { PERMISSIONS } from "@/lib/rbac/permissions"

// ============================================================================
// PERIOD_PATTERN
// ============================================================================

describe("PERIOD_PATTERN", () => {
  it.each(["202604", "299912", "000000"])("accepts %s", (value) => {
    expect(PERIOD_PATTERN.test(value)).toBe(true)
  })

  it.each(["2026", "2026041", "20260a", "abcdef", ""])("rejects %s", (value) => {
    expect(PERIOD_PATTERN.test(value)).toBe(false)
  })

  it("is not sticky/global, so repeated tests do not alternate", () => {
    // A /g regex would flip between true and false across calls via lastIndex.
    expect(PERIOD_PATTERN.test("202604")).toBe(true)
    expect(PERIOD_PATTERN.test("202604")).toBe(true)
  })
})

// ============================================================================
// periodToMonthInput / monthInputToPeriod
// ============================================================================

describe("periodToMonthInput", () => {
  it("converts a raw period to the <input type=month> value", () => {
    expect(periodToMonthInput("202604")).toBe("2026-04")
  })

  it("keeps January and December on the right side of the boundary", () => {
    expect(periodToMonthInput("202601")).toBe("2026-01")
    expect(periodToMonthInput("202612")).toBe("2026-12")
  })

  it("returns an empty string for a malformed period", () => {
    expect(periodToMonthInput("2026")).toBe("")
    expect(periodToMonthInput("20260a")).toBe("")
    expect(periodToMonthInput("")).toBe("")
  })

  it("returns an empty string for an out-of-range month", () => {
    // Shape-valid but not a real month — must not produce "2026-00"/"2026-13".
    expect(periodToMonthInput("202600")).toBe("")
    expect(periodToMonthInput("202613")).toBe("")
  })
})

describe("monthInputToPeriod", () => {
  it("converts the month-input value back to a raw period", () => {
    expect(monthInputToPeriod("2026-04")).toBe("202604")
  })

  it("returns an empty string for empty or malformed input", () => {
    expect(monthInputToPeriod("")).toBe("")
    expect(monthInputToPeriod("2026")).toBe("")
    expect(monthInputToPeriod("2026-4")).toBe("")
    expect(monthInputToPeriod("2026/04")).toBe("")
    expect(monthInputToPeriod("abcdef")).toBe("")
  })

  it("does not range-check the month (shape only)", () => {
    // Documented behaviour: only the YYYY-MM shape is enforced here; the form
    // schema's PERIOD_PATTERN and the backend do the semantic checking.
    expect(monthInputToPeriod("2026-13")).toBe("202613")
  })
})

describe("period round-trip", () => {
  it.each(["202601", "202604", "202612", "299912"])("round-trips %s", (period) => {
    expect(monthInputToPeriod(periodToMonthInput(period))).toBe(period)
  })
})

// ============================================================================
// formatPeriod
// ============================================================================

describe("formatPeriod", () => {
  it("renders a friendly month and year", () => {
    expect(formatPeriod("202604")).toBe("April 2026")
  })

  it("gets both month boundaries right", () => {
    expect(formatPeriod("202601")).toBe("January 2026")
    expect(formatPeriod("202612")).toBe("December 2026")
  })

  it("returns the raw value when the period is malformed", () => {
    expect(formatPeriod("2026")).toBe("2026")
    expect(formatPeriod("abcdef")).toBe("abcdef")
    expect(formatPeriod("")).toBe("")
  })

  it("returns the raw value for an out-of-range month", () => {
    expect(formatPeriod("202600")).toBe("202600")
    expect(formatPeriod("202613")).toBe("202613")
  })
})

// ============================================================================
// formatNumeric
// ============================================================================

describe("formatNumeric", () => {
  it("adds thousand separators", () => {
    expect(formatNumeric(1234567)).toBe("1,234,567")
  })

  it("renders zero as '0' rather than a dash-triggering null", () => {
    // Zero is a legitimate value for the four monthly cost fields.
    expect(formatNumeric(0)).toBe("0")
  })

  it("truncates to the default 4 fraction digits", () => {
    expect(formatNumeric(1234.567891)).toBe("1,234.5679")
  })

  it("keeps all six decimals when asked (NUMERIC(20,6))", () => {
    expect(formatNumeric(1234.567891, 6)).toBe("1,234.567891")
  })

  it("drops trailing zeros (minimumFractionDigits is 0)", () => {
    expect(formatNumeric(1500.5)).toBe("1,500.5")
    expect(formatNumeric(1500)).toBe("1,500")
  })

  it("returns null for missing values so callers can render a dash", () => {
    expect(formatNumeric(undefined)).toBeNull()
    expect(formatNumeric(null)).toBeNull()
    expect(formatNumeric(Number.NaN)).toBeNull()
  })
})

// ============================================================================
// Form defaults
// ============================================================================

describe("DEFAULT_SPIN_FIXED_COST_FORM_VALUES", () => {
  it("starts empty and active", () => {
    expect(DEFAULT_SPIN_FIXED_COST_FORM_VALUES).toEqual({
      period: "",
      commonPoyDenier: 0,
      poyProduction: 0,
      spinPowerMonth: 0,
      spinManpowerMonth: 0,
      spinOverheadsMonth: 0,
      spinConssprsMonth: 0,
      isActive: true,
    })
  })
})

// ============================================================================
// Parsers — camelCase + snake_case, missing audit
// ============================================================================

describe("SpinFixedCostParser", () => {
  it("parses camelCase payloads", () => {
    const parsed = SpinFixedCostParser.fromJSON({
      id: "sfc-1",
      period: "202604",
      commonPoyDenier: 150.5,
      poyProduction: 2_000_000,
      spinPowerMonth: 1_000,
      spinManpowerMonth: 2_000,
      spinOverheadsMonth: 3_000,
      spinConssprsMonth: 4_000,
      isActive: true,
      audit: { createdBy: "admin", createdAt: "2026-04-01T00:00:00Z" },
    })

    expect(parsed.id).toBe("sfc-1")
    expect(parsed.period).toBe("202604")
    expect(parsed.commonPoyDenier).toBe(150.5)
    expect(parsed.poyProduction).toBe(2_000_000)
    expect(parsed.spinConssprsMonth).toBe(4_000)
    expect(parsed.isActive).toBe(true)
    expect(parsed.audit?.createdBy).toBe("admin")
  })

  it("parses snake_case payloads identically (house pattern)", () => {
    const parsed = SpinFixedCostParser.fromJSON({
      id: "sfc-1",
      period: "202604",
      common_poy_denier: 150.5,
      poy_production: 2_000_000,
      spin_power_month: 1_000,
      spin_manpower_month: 2_000,
      spin_overheads_month: 3_000,
      spin_conssprs_month: 4_000,
      is_active: true,
    })

    expect(parsed.commonPoyDenier).toBe(150.5)
    expect(parsed.poyProduction).toBe(2_000_000)
    expect(parsed.spinPowerMonth).toBe(1_000)
    expect(parsed.spinManpowerMonth).toBe(2_000)
    expect(parsed.spinOverheadsMonth).toBe(3_000)
    expect(parsed.spinConssprsMonth).toBe(4_000)
    expect(parsed.isActive).toBe(true)
  })

  it("coerces numerics that arrive as strings", () => {
    const parsed = SpinFixedCostParser.fromJSON({
      id: "sfc-1",
      period: "202604",
      common_poy_denier: "150.5",
      poy_production: "2000000",
    })

    expect(parsed.commonPoyDenier).toBe(150.5)
    expect(parsed.poyProduction).toBe(2_000_000)
  })

  it("tolerates missing audit info and missing numerics", () => {
    const parsed = SpinFixedCostParser.fromJSON({ id: "sfc-1", period: "202604" })

    expect(parsed.audit).toBeUndefined()
    expect(parsed.commonPoyDenier).toBe(0)
    expect(parsed.poyProduction).toBe(0)
    expect(parsed.isActive).toBe(false)
  })
})

describe("ListSpinFixedCostsResponseParser", () => {
  it("parses a snake_case list envelope with a string totalItems", () => {
    const parsed = ListSpinFixedCostsResponseParser.fromJSON({
      base: { isSuccess: true, statusCode: "200", message: "ok", validationErrors: [] },
      data: [{ id: "sfc-1", period: "202604", common_poy_denier: 150, poy_production: 10 }],
      pagination: { current_page: 1, page_size: 10, total_items: "1", total_pages: 1 },
    })

    expect(parsed.base?.isSuccess).toBe(true)
    expect(parsed.data).toHaveLength(1)
    expect(parsed.data[0].commonPoyDenier).toBe(150)
    // int64 arrives as a string — callers must Number(...) it.
    expect(Number(parsed.pagination?.totalItems)).toBe(1)
  })

  it("yields an empty data array when the backend omits it", () => {
    const parsed = ListSpinFixedCostsResponseParser.fromJSON({ base: { isSuccess: true } })
    expect(parsed.data).toEqual([])
  })
})

describe("CreateSpinFixedCostResponseParser", () => {
  it("keeps the backend base message intact (duplicate-period path)", () => {
    const parsed = CreateSpinFixedCostResponseParser.fromJSON({
      base: {
        isSuccess: false,
        statusCode: "409",
        message: "Period 202604 already exists - edit the existing row instead of creating a new one.",
        validationErrors: [],
      },
    })

    expect(parsed.base?.isSuccess).toBe(false)
    expect(parsed.base?.message).toContain("edit the existing row")
  })
})

// ============================================================================
// RBAC permission codes
// ============================================================================

describe("SpinFixedCost RBAC permission codes", () => {
  it("declares exactly the four CRUD codes", () => {
    expect(PERMISSIONS.SpinFixedCost).toEqual({
      spinfixedcostView: "finance.master.spinfixedcost.view",
      spinfixedcostCreate: "finance.master.spinfixedcost.create",
      spinfixedcostUpdate: "finance.master.spinfixedcost.update",
      spinfixedcostDelete: "finance.master.spinfixedcost.delete",
    })
  })

  it("uses no underscores inside a segment (IAM CHECK constraint)", () => {
    for (const code of Object.values(PERMISSIONS.SpinFixedCost)) {
      expect(code).not.toContain("_")
      expect(code.split(".")).toHaveLength(4)
      expect(code).toMatch(/^finance\.master\.spinfixedcost\.(view|create|update|delete)$/)
    }
  })
})
