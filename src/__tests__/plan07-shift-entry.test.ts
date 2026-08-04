import { describe, it, expect } from "vitest"
import { keypadAppend, keypadBackspace } from "@/components/common/numeric-keypad"
import { validateStep, emptyDraft, toDowntimeEntries, toWasteEntries, toInt } from "@/components/ppc/daily-performance/shift-entry-model"

describe("keypad", () => {
  it("builds integers without a leading zero", () => {
    let v = ""
    for (const k of ["0", "5", "2"]) v = keypadAppend(v, k, false)
    expect(v).toBe("52")
  })
  it("rejects a second decimal point", () => {
    let v = keypadAppend("12", ".", true)
    v = keypadAppend(v, "5", true)
    v = keypadAppend(v, ".", true)
    expect(v).toBe("12.5")
  })
  it("rejects a decimal when not allowed", () => {
    expect(keypadAppend("12", ".", false)).toBe("12")
  })
  it("backspaces", () => expect(keypadBackspace("120")).toBe("12"))
})

describe("validation", () => {
  const base = { ...emptyDraft(1, "2026-07-30"), machineId: 7, machineNo: "TXT-01", shift: "1", shiftName: "Shift 1" }
  it("blocks running > total", () => {
    const d = { ...base, positionsTotal: "216", positionsRunning: "300" }
    expect(validateStep("positions", d).positionsRunning).toContain("cannot exceed")
  })
  it("accepts running <= total", () => {
    const d = { ...base, positionsTotal: "216", positionsRunning: "208" }
    expect(validateStep("positions", d)).toEqual({})
  })
  it("requires a machine", () => {
    expect(validateStep("context", emptyDraft(1, "2026-07-30")).machine).toBeTruthy()
  })
  it("rejects a future date", () => {
    expect(validateStep("context", { ...base, date: "2099-01-01" }).date).toContain("future")
  })
  it("rejects zero-duration downtime", () => {
    const d = { ...base, downtime: [{ key: "a", reasonId: 3, reasonCode: "XST", reasonName: "x", durationMin: "0", notes: "" }] }
    expect(Object.keys(validateStep("downtime", d))).toHaveLength(1)
  })
  it("rejects downtime longer than the shift", () => {
    const d = { ...base, downtime: [{ key: "a", reasonId: 3, reasonCode: "XST", reasonName: "x", durationMin: "600", notes: "" }] }
    expect(validateStep("downtime", d).downtimeTotal).toContain("longer than")
  })
})

describe("payload shape unchanged", () => {
  it("maps downtime + waste to the wire types", () => {
    expect(toDowntimeEntries([{ key: "a", reasonId: 3, reasonCode: "X", reasonName: "x", durationMin: "45", notes: "n" }]))
      .toEqual([{ reasonId: 3, durationMin: 45, notes: "n" }])
    expect(toWasteEntries([{ key: "b", categoryId: 9, categoryCode: "DTY", categoryName: "d", categoryType: "WASTE", qtyKg: "12.5", isUpset: true, notes: "" }]))
      .toEqual([{ categoryId: 9, qtyKg: "12.5", isUpset: true, notes: "" }])
  })
  it("drops unselected rows", () => {
    expect(toDowntimeEntries([{ key: "a", reasonId: 0, reasonCode: "", reasonName: "", durationMin: "5", notes: "" }])).toEqual([])
  })
  it("positionsTotal is an int, positionsRunning stays a string", () => {
    expect(toInt("216")).toBe(216)
    expect(toInt("21.6")).toBeNull()
  })
})
