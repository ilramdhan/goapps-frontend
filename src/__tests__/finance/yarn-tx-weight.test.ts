import { describe, it, expect } from "vitest"

import {
  TX_WEIGHT_FALLBACK_LABEL,
  YarnTxWeightGrade,
  YarnTxWeightMode,
  buildProductTypeOwnerMap,
  formatTxWeightPreview,
  fromRuleFormRows,
  gradeCodeToEnum,
  groupRulePreviews,
  modeCodeToEnum,
  normalizeYarnTxWeightGroup,
  toGradeCode,
  toModeCode,
  toRuleFormRows,
  toYarnTxWeightGroupRequestBody,
} from "@/types/finance/yarn-tx-weight"

describe("yarn tx weight enums + preview", () => {
  it("formats previews per mode", () => {
    expect(formatTxWeightPreview("LESS_BY", 0.5)).toBe("AX − 0.5")
    expect(formatTxWeightPreview("MULTIPLY", 0.65)).toBe("AX × 0.65")
    expect(formatTxWeightPreview("FIXED", 2.5)).toBe("2.5")
    expect(formatTxWeightPreview("MULTIPLY", 0.1 + 0.2)).toBe("AX × 0.3")
    expect(formatTxWeightPreview("", 1)).toBe("—")
  })

  it("maps grade/mode codes from numbers, enum names and short codes", () => {
    expect(toGradeCode(YarnTxWeightGrade.YARN_TX_WEIGHT_GRADE_A9)).toBe("A9")
    expect(toGradeCode("YARN_TX_WEIGHT_GRADE_AE")).toBe("AE")
    expect(toGradeCode("C")).toBe("C")
    expect(toGradeCode("X")).toBe("")
    expect(toModeCode(YarnTxWeightMode.YARN_TX_WEIGHT_MODE_FIXED)).toBe("FIXED")
    expect(toModeCode("YARN_TX_WEIGHT_MODE_LESS_BY")).toBe("LESS_BY")
    expect(gradeCodeToEnum("B")).toBe(YarnTxWeightGrade.YARN_TX_WEIGHT_GRADE_B)
    expect(gradeCodeToEnum("")).toBe(YarnTxWeightGrade.YARN_TX_WEIGHT_GRADE_UNSPECIFIED)
    expect(modeCodeToEnum("MULTIPLY")).toBe(YarnTxWeightMode.YARN_TX_WEIGHT_MODE_MULTIPLY)
  })
})

describe("normalizeYarnTxWeightGroup", () => {
  it("normalizes camelCase payloads, sorting types by code and rules AE → C", () => {
    const g = normalizeYarnTxWeightGroup({
      groupId: "g1",
      code: "TTY",
      name: "Twisted",
      productTypes: [
        { id: 7, code: "TTS", name: "TT S" },
        { id: "3", code: "ATT", name: "ATT" },
      ],
      rules: [
        { grade: "YARN_TX_WEIGHT_GRADE_C", mode: "YARN_TX_WEIGHT_MODE_FIXED", value: "2.5" },
        { grade: YarnTxWeightGrade.YARN_TX_WEIGHT_GRADE_AE, mode: YarnTxWeightMode.YARN_TX_WEIGHT_MODE_LESS_BY, value: 0.5 },
      ],
      audit: { createdAt: "t", updatedBy: "u" },
    })
    expect(g).toMatchObject({ groupId: "g1", code: "TTY", name: "Twisted", description: "", createdAt: "t", updatedBy: "u" })
    expect(g.productTypes).toEqual([
      { id: 3, code: "ATT", name: "ATT" },
      { id: 7, code: "TTS", name: "TT S" },
    ])
    expect(g.rules.map((r) => [r.grade, r.mode, r.value])).toEqual([
      ["AE", "LESS_BY", 0.5],
      ["C", "FIXED", 2.5],
    ])
  })

  it("normalizes snake_case payloads and empty input", () => {
    const g = normalizeYarnTxWeightGroup({
      group_id: "g2",
      product_types: [{ id: 1, code: "DTY", name: "DTY" }],
      audit: { created_by: "a", updated_at: "b" },
    })
    expect(g).toMatchObject({ groupId: "g2", createdBy: "a", updatedAt: "b", rules: [] })
    expect(g.productTypes).toHaveLength(1)
    expect(normalizeYarnTxWeightGroup({})).toMatchObject({ groupId: "", code: "", productTypes: [], rules: [] })
  })
})

describe("preview + form helpers", () => {
  const group = normalizeYarnTxWeightGroup({
    groupId: "g1",
    code: "TTY",
    rules: [
      { grade: "AE", mode: "LESS_BY", value: 0.5, description: "keep me" },
      { grade: "A9", mode: "MULTIPLY", value: 0.65 },
      { grade: "C", mode: "FIXED", value: 2.5 },
    ],
  })

  it("builds AE–C previews with ratio fallback for missing grades", () => {
    expect(groupRulePreviews(group)).toEqual([
      { grade: "AE", preview: "AX − 0.5", hasRule: true },
      { grade: "A9", preview: "AX × 0.65", hasRule: true },
      { grade: "A", preview: TX_WEIGHT_FALLBACK_LABEL, hasRule: false },
      { grade: "B", preview: TX_WEIGHT_FALLBACK_LABEL, hasRule: false },
      { grade: "C", preview: "2.5", hasRule: true },
    ])
  })

  it("round-trips rules through the five form rows, dropping empty modes", () => {
    const rows = toRuleFormRows(group.rules)
    expect(rows.map((r) => r.grade)).toEqual(["AE", "A9", "A", "B", "C"])
    expect(rows[2]).toEqual({ grade: "A", mode: "", value: 0 })
    const out = fromRuleFormRows(rows, group.rules)
    expect(out).toEqual([
      { grade: "AE", mode: "LESS_BY", value: 0.5, description: "keep me" },
      { grade: "A9", mode: "MULTIPLY", value: 0.65, description: "" },
      { grade: "C", mode: "FIXED", value: 2.5, description: "" },
    ])
  })

  it("maps product type owners excluding the group being edited", () => {
    const groups = [
      { groupId: "g1", code: "TTY", productTypes: [{ id: 1, code: "TTY", name: "" }, { id: 2, code: "TTS", name: "" }] },
      { groupId: "g2", code: "DTY", productTypes: [{ id: 3, code: "DTY", name: "" }] },
    ]
    const all = buildProductTypeOwnerMap(groups)
    expect(all.get(2)).toBe("TTY")
    expect(all.get(3)).toBe("DTY")
    const editingG1 = buildProductTypeOwnerMap(groups, "g1")
    expect(editingG1.has(1)).toBe(false)
    expect(editingG1.get(3)).toBe("DTY")
  })

  it("maps a BFF body to the gRPC request (codes → enums, dedup ids)", () => {
    const body = toYarnTxWeightGroupRequestBody({
      code: " tty ",
      name: " Twisted ",
      product_type_ids: [1, "2", 2, 0, -1, "x"],
      rules: [{ grade: "AE", mode: "LESS_BY", value: "0.5" }],
    })
    expect(body).toEqual({
      code: "TTY",
      name: "Twisted",
      description: "",
      productTypeIds: [1, 2],
      rules: [
        {
          grade: YarnTxWeightGrade.YARN_TX_WEIGHT_GRADE_AE,
          mode: YarnTxWeightMode.YARN_TX_WEIGHT_MODE_LESS_BY,
          value: 0.5,
          description: "",
        },
      ],
    })
  })
})
