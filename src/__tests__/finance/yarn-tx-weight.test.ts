import { describe, it, expect } from "vitest"

import {
  YarnTxWeightGrade,
  YarnTxWeightMode,
  formatTxWeightPreview,
  gradeCodeToEnum,
  modeCodeToEnum,
  normalizeYarnTxWeight,
  toGradeCode,
  toModeCode,
} from "@/types/finance/yarn-tx-weight"
import { groupYarnTxWeights } from "@/components/finance/yarn-tx-weight/yarn-tx-weight-table"

describe("yarn tx weight types", () => {
  it("formats previews per mode", () => {
    expect(formatTxWeightPreview("LESS_BY", 0.5)).toBe("AX − 0.5")
    expect(formatTxWeightPreview("MULTIPLY", 0.65)).toBe("AX × 0.65")
    expect(formatTxWeightPreview("FIXED", 2.5)).toBe("= 2.5")
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

  it("normalizes camelCase and snake_case payloads", () => {
    const camel = normalizeYarnTxWeight({
      id: "x", productTypeId: 3, productTypeCode: "DTY", productTypeName: "Draw Textured",
      grade: 2, mode: 2, value: 0.65, audit: { createdAt: "t" },
    })
    expect(camel).toMatchObject({ productTypeId: 3, productTypeCode: "DTY", grade: "A9", mode: "MULTIPLY", value: 0.65, createdAt: "t" })
    const snake = normalizeYarnTxWeight({
      id: "y", product_type_id: "4", product_type_code: "POY", grade: "YARN_TX_WEIGHT_GRADE_B",
      mode: "YARN_TX_WEIGHT_MODE_LESS_BY", value: "12.5", audit: { updated_by: "u" },
    })
    expect(snake).toMatchObject({ productTypeId: 4, productTypeCode: "POY", grade: "B", mode: "LESS_BY", value: 12.5, updatedBy: "u" })
  })

  it("groups by product type and orders grades AE→C", () => {
    const mk = (pt: number, code: string, grade: string) =>
      normalizeYarnTxWeight({ id: `${code}-${grade}`, productTypeId: pt, productTypeCode: code, grade, mode: 1, value: 0 })
    const groups = groupYarnTxWeights([mk(2, "POY", "C"), mk(1, "DTY", "A"), mk(2, "POY", "AE"), mk(1, "DTY", "A9")])
    expect(groups.map((g) => g.code)).toEqual(["DTY", "POY"])
    expect(groups[0].rows.map((r) => r.grade)).toEqual(["A9", "A"])
    expect(groups[1].rows.map((r) => r.grade)).toEqual(["AE", "C"])
  })
})
