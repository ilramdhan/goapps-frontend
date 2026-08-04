import { describe, it, expect } from "vitest"

import { classifyLotError, isLotFailure } from "@/components/ppc/work-order/lot-error-hint"

/**
 * These are the EXACT strings the PPC backend produces, captured by running the
 * Go constructors rather than retyped by hand — a paraphrased fixture would let
 * this suite pass while the real classifier broke.
 *
 * Source: services/ppc/internal/domain/workorder/lot_errors.go
 *   NewLotItemShadeError("POY0000451"), NewLotStdWeightError("TTY0000028","AC3"),
 *   NewLotProductError(), ErrLotNotFound
 */
const ITEM_SHADE =
  "cannot generate lot: the product has no ERP item code and shade code for product POY0000451. " +
  "Set the ERP item code and shade code on the product master, or enter a lot number already registered in lot master."

const STD_WEIGHT =
  "cannot generate lot: the standard bobbin weight (STD_WEIGHT) is not set for product TTY0000028 on machine AC3. " +
  "Set STD_WEIGHT for this product under Production Plan > Masters > Product Machine Parameters, or on the product's cost parameters."

const NO_PRODUCT =
  "cannot generate lot: the plan item is not linked to a product. " +
  "Link a product to the plan item, or enter a lot number already registered in lot master."

const LOT_NOT_REGISTERED =
  "invalid lot: this lot number is not registered in lot master — " +
  "register it under Production Plan > Masters > Lots, or leave the lot blank to have one generated"

/**
 * ErrLotGenerationUnavailable — raised when the server has no lot provisioner
 * wired (service.go, the `s.lotProv == nil` branch). A regression in an earlier
 * round made isLotFailure require a known cause phrase, which silently dropped
 * this message from the alert entirely: it contains "lot master" but carried no
 * phrase. It is now inside the contract.
 */
const GENERATION_UNAVAILABLE =
  "cannot generate lot: lot number generation is not available — " +
  "enter a lot number registered in lot master"

describe("classifyLotError", () => {
  it("sends a missing item/shade code to the PRODUCT master, not the parameter master", () => {
    // ERP item code and shade code live on cost_product_master. The parameter
    // master edits mst_parameter definitions and cannot set an item code, so
    // linking there sent the planner somewhere that could not help.
    expect(classifyLotError(ITEM_SHADE)?.href).toBe("/finance/product-master")
  })

  it("sends a missing STD_WEIGHT to the product machine parameters", () => {
    expect(classifyLotError(STD_WEIGHT)?.href).toBe(
      "/production-plan/masters/product-machine-parameters"
    )
  })

  it("sends an unregistered manual lot to the lot master", () => {
    expect(classifyLotError(LOT_NOT_REGISTERED)?.href).toBe("/production-plan/masters/lots")
  })

  it("sends an unavailable generator to the lot master, since entering an existing lot is the workaround", () => {
    expect(classifyLotError(GENERATION_UNAVAILABLE)?.href).toBe("/production-plan/masters/lots")
  })

  /**
   * The regression this file exists for.
   *
   * NO_PRODUCT's fix hint ends "...or enter a lot number already registered in
   * lot master", so a naive `includes("lot master")` matched it and linked the
   * planner to Lot Master — for the one failure Lot Master cannot fix. The
   * message must classify to no link at all.
   */
  it("offers NO link for an unlinked plan item, despite its hint mentioning lot master", () => {
    expect(NO_PRODUCT.toLowerCase()).toContain("lot master")
    expect(classifyLotError(NO_PRODUCT)).toBeNull()
  })

  it("ignores messages that are not lot failures", () => {
    expect(classifyLotError("invalid machine: area does not match work order area")).toBeNull()
    expect(classifyLotError("")).toBeNull()
    expect(classifyLotError(undefined)).toBeNull()
  })

  /**
   * Each message must resolve to one destination and never to another's. This is
   * the frontend half of the mutual-exclusivity contract asserted on the Go side
   * by TestLotCausePhrases_AreMutuallyExclusive.
   */
  it("never resolves one failure to another's destination", () => {
    const cases = [
      { msg: ITEM_SHADE, href: "/finance/product-master" },
      { msg: STD_WEIGHT, href: "/production-plan/masters/product-machine-parameters" },
      { msg: LOT_NOT_REGISTERED, href: "/production-plan/masters/lots" },
      { msg: GENERATION_UNAVAILABLE, href: "/production-plan/masters/lots" },
    ]
    for (const { msg, href } of cases) {
      const got = classifyLotError(msg)?.href
      expect(got).toBe(href)
      for (const other of cases) {
        if (other.href !== href) expect(got).not.toBe(other.href)
      }
    }
  })
})

describe("isLotFailure", () => {
  it("recognises every lot failure the backend can emit", () => {
    for (const msg of [
      ITEM_SHADE,
      STD_WEIGHT,
      NO_PRODUCT,
      LOT_NOT_REGISTERED,
      GENERATION_UNAVAILABLE,
    ]) {
      expect(isLotFailure(msg)).toBe(true)
    }
  })

  it("does not dress up an unrelated error as a fixable master-data problem", () => {
    expect(isLotFailure("invalid quantity: must be greater than zero")).toBe(false)
    // Mentions a lot, but carries no known cause — must not render the hint.
    expect(isLotFailure("work order WO-123 already has lot SPG0042-26")).toBe(false)
    expect(isLotFailure(undefined)).toBe(false)
  })
})
