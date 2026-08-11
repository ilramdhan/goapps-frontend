// Spin Fixed Cost BFF routes — /api/v1/finance/spin-fixed-costs
//
// Three load-bearing behaviours are covered here:
//  1. POST rewrites the backend's live-period unique-index violation into an
//     "edit the existing row instead" instruction (and only for that error).
//  2. PUT never forwards `period` — it is immutable and not on the update RPC.
//  3. DELETE passes the backend's anchor-guard refusal through verbatim.
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import * as grpc from "@grpc/grpc-js"

// ─── gRPC client mock ────────────────────────────────────────────────────────

const listSpinFixedCosts = vi.fn()
const createSpinFixedCost = vi.fn()
const getSpinFixedCost = vi.fn()
const updateSpinFixedCost = vi.fn()
const deleteSpinFixedCost = vi.fn()

vi.mock("@/lib/grpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/grpc")>()
  return {
    ...actual,
    // Real error mapping is kept — the pass-through assertions depend on it.
    createMetadataFromRequest: () => ({ metadata: true }),
    getSpinFixedCostClient: () => ({
      listSpinFixedCosts,
      createSpinFixedCost,
      getSpinFixedCost,
      updateSpinFixedCost,
      deleteSpinFixedCost,
    }),
  }
})

// ─── Modules under test (imported after the mock is registered) ──────────────

import { GET as listRoute, POST as createRoute } from "@/app/api/v1/finance/spin-fixed-costs/route"
import {
  GET as getRoute,
  PUT as updateRoute,
  DELETE as deleteRoute,
} from "@/app/api/v1/finance/spin-fixed-costs/[id]/route"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE_URL = "http://localhost:3000/api/v1/finance/spin-fixed-costs"

function getRequest(query = "") {
  return new NextRequest(`${BASE_URL}${query}`, { method: "GET" })
}

function jsonRequest(method: "POST" | "PUT", body: unknown, path = "") {
  return new NextRequest(`${BASE_URL}${path}`, {
    method,
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  })
}

function idContext(id: string) {
  return { params: Promise.resolve({ id }) }
}

/** A gRPC ServiceError shaped well enough for isGrpcError(). */
function grpcError(code: number, details: string) {
  return Object.assign(new Error(details), {
    code,
    details,
    metadata: new grpc.Metadata(),
  }) as grpc.ServiceError
}

const SAMPLE_ROW = {
  id: "sfc-1",
  period: "202604",
  commonPoyDenier: 150.5,
  poyProduction: 2_000_000,
  spinPowerMonth: 1_000,
  spinManpowerMonth: 2_000,
  spinOverheadsMonth: 3_000,
  spinConssprsMonth: 4_000,
  isActive: true,
}

const OK_BASE = { isSuccess: true, statusCode: "200", message: "OK", validationErrors: [] }

beforeEach(() => {
  vi.clearAllMocks()
  // Route error branches console.error on purpose; keep the test output clean.
  vi.spyOn(console, "error").mockImplementation(() => {})
})

// ============================================================================
// GET list — query param mapping
// ============================================================================

describe("GET /api/v1/finance/spin-fixed-costs", () => {
  it("maps every query param through to the gRPC request", async () => {
    listSpinFixedCosts.mockResolvedValue({
      base: OK_BASE,
      data: [SAMPLE_ROW],
      pagination: { currentPage: 2, pageSize: 25, totalItems: "1", totalPages: 1 },
    })

    const response = await listRoute(
      getRequest("?page=2&pageSize=25&sortBy=period&sortOrder=asc&search=2026&activeFilter=1&period=202604")
    )

    expect(listSpinFixedCosts).toHaveBeenCalledTimes(1)
    expect(listSpinFixedCosts.mock.calls[0][0]).toEqual({
      page: 2,
      pageSize: 25,
      search: "2026",
      activeFilter: 1,
      period: "202604",
      sortBy: "period",
      sortOrder: "asc",
    })

    const body = await response.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.totalItems).toBe("1")
  })

  it("accepts snake_case query params too", async () => {
    listSpinFixedCosts.mockResolvedValue({ base: OK_BASE, data: [], pagination: {} })

    await listRoute(getRequest("?page=3&page_size=50&sort_by=period&sort_order=asc&active_filter=2"))

    expect(listSpinFixedCosts.mock.calls[0][0]).toMatchObject({
      page: 3,
      pageSize: 50,
      sortBy: "period",
      sortOrder: "asc",
      activeFilter: 2,
    })
  })

  it("falls back to page 1 / size 10 / period desc when nothing is supplied", async () => {
    listSpinFixedCosts.mockResolvedValue({ base: OK_BASE, data: [], pagination: {} })

    await listRoute(getRequest())

    expect(listSpinFixedCosts.mock.calls[0][0]).toEqual({
      page: 1,
      pageSize: 10,
      search: "",
      activeFilter: 0,
      period: "",
      sortBy: "period",
      sortOrder: "desc",
    })
  })

  it("returns an empty-pagination 500 envelope on a non-gRPC failure", async () => {
    listSpinFixedCosts.mockRejectedValue(new Error("boom"))

    const response = await listRoute(getRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.base.isSuccess).toBe(false)
    expect(body.data).toEqual([])
    expect(body.pagination.totalItems).toBe("0")
  })
})

// ============================================================================
// POST create — success + duplicate-period rewrite
// ============================================================================

describe("POST /api/v1/finance/spin-fixed-costs", () => {
  it("forwards the create payload and returns the normalized shape", async () => {
    createSpinFixedCost.mockResolvedValue({ base: OK_BASE, data: SAMPLE_ROW })

    const response = await createRoute(
      jsonRequest("POST", {
        period: "202605",
        commonPoyDenier: 150.5,
        poyProduction: 2_000_000,
        spinPowerMonth: 1_000,
        spinManpowerMonth: 2_000,
        spinOverheadsMonth: 3_000,
        spinConssprsMonth: 4_000,
      })
    )
    const body = await response.json()

    expect(createSpinFixedCost.mock.calls[0][0]).toEqual({
      period: "202605",
      commonPoyDenier: 150.5,
      poyProduction: 2_000_000,
      spinPowerMonth: 1_000,
      spinManpowerMonth: 2_000,
      spinOverheadsMonth: 3_000,
      spinConssprsMonth: 4_000,
    })
    expect(body.base.isSuccess).toBe(true)
    expect(body.data).toMatchObject({ id: "sfc-1", period: "202604" })
    expect(body).not.toHaveProperty("pagination")
  })

  // Every backend phrasing the rewrite is meant to catch.
  const DUPLICATE_MESSAGES = [
    "spin fixed cost for period 202604 already exists",
    "duplicate key value violates constraint",
    'unique constraint "x" violated',
    'pq: duplicate key value violates unique constraint "uniq_spin_fixed_cost_period_live"',
    "ERROR: duplicate key (SQLSTATE 23505)",
    // Trigger words alone, in case the backend wording changes around them.
    "uniq_spin_fixed_cost_period_live",
    "sqlstate 23505",
  ]

  it.each(DUPLICATE_MESSAGES)(
    "rewrites the duplicate-period gRPC error %#: %s",
    async (backendMessage) => {
      createSpinFixedCost.mockRejectedValue(grpcError(grpc.status.ALREADY_EXISTS, backendMessage))

      const response = await createRoute(jsonRequest("POST", { period: "202604", commonPoyDenier: 1, poyProduction: 1 }))
      const body = await response.json()

      expect(response.status).toBe(409)
      expect(body.base.isSuccess).toBe(false)
      expect(body.base.message).toBe(
        "Period 202604 already exists - edit the existing row instead of creating a new one."
      )
      // The raw constraint noise must not leak to the finance user.
      expect(body.base.message).not.toContain("SQLSTATE")
      expect(body.base.message).not.toContain("uniq_")
    }
  )

  it("matches the duplicate triggers case-insensitively", async () => {
    createSpinFixedCost.mockRejectedValue(grpcError(grpc.status.INTERNAL, "DUPLICATE KEY VALUE"))

    const response = await createRoute(jsonRequest("POST", { period: "202604" }))
    const body = await response.json()

    expect(body.base.message).toContain("edit the existing row instead")
  })

  it("falls back to 'That period' when the client sent no period", async () => {
    createSpinFixedCost.mockRejectedValue(grpcError(grpc.status.ALREADY_EXISTS, "already exists"))

    const response = await createRoute(jsonRequest("POST", { commonPoyDenier: 1 }))
    const body = await response.json()

    expect(body.base.message).toBe(
      "That period already exists - edit the existing row instead of creating a new one."
    )
  })

  it("rewrites the duplicate when it arrives as a non-success base instead of a gRPC error", async () => {
    createSpinFixedCost.mockResolvedValue({
      base: {
        isSuccess: false,
        statusCode: "409",
        message: 'duplicate key value violates unique constraint "uniq_spin_fixed_cost_period_live"',
        validationErrors: [],
      },
      data: undefined,
    })

    const response = await createRoute(jsonRequest("POST", { period: "202604" }))
    const body = await response.json()

    expect(body.base.isSuccess).toBe(false)
    expect(body.base.statusCode).toBe("409")
    expect(body.base.message).toBe(
      "Period 202604 already exists - edit the existing row instead of creating a new one."
    )
  })

  it("passes a non-duplicate gRPC error through verbatim", async () => {
    const backendMessage = "common_poy_denier must be greater than zero"
    createSpinFixedCost.mockRejectedValue(grpcError(grpc.status.INVALID_ARGUMENT, backendMessage))

    const response = await createRoute(jsonRequest("POST", { period: "202604", commonPoyDenier: 0 }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.base.message).toBe(backendMessage)
    expect(body.base.message).not.toContain("edit the existing row")
  })

  it("passes a non-duplicate non-success base through verbatim", async () => {
    createSpinFixedCost.mockResolvedValue({
      base: { isSuccess: false, statusCode: "400", message: "poy_production must be > 0", validationErrors: [] },
    })

    const response = await createRoute(jsonRequest("POST", { period: "202604" }))
    const body = await response.json()

    expect(body.base.message).toBe("poy_production must be > 0")
  })

  it("coerces missing numerics to 0 rather than sending undefined", async () => {
    createSpinFixedCost.mockResolvedValue({ base: OK_BASE, data: SAMPLE_ROW })

    await createRoute(jsonRequest("POST", { period: "202604" }))

    expect(createSpinFixedCost.mock.calls[0][0]).toEqual({
      period: "202604",
      commonPoyDenier: 0,
      poyProduction: 0,
      spinPowerMonth: 0,
      spinManpowerMonth: 0,
      spinOverheadsMonth: 0,
      spinConssprsMonth: 0,
    })
  })
})

// ============================================================================
// GET by id
// ============================================================================

describe("GET /api/v1/finance/spin-fixed-costs/[id]", () => {
  it("forwards the id and returns the row", async () => {
    getSpinFixedCost.mockResolvedValue({ base: OK_BASE, data: SAMPLE_ROW })

    const response = await getRoute(getRequest("/sfc-1"), idContext("sfc-1"))
    const body = await response.json()

    expect(getSpinFixedCost.mock.calls[0][0]).toEqual({ id: "sfc-1" })
    expect(body.data.period).toBe("202604")
  })

  it("maps a NOT_FOUND gRPC error to 404 with the backend message", async () => {
    getSpinFixedCost.mockRejectedValue(grpcError(grpc.status.NOT_FOUND, "spin fixed cost not found"))

    const response = await getRoute(getRequest("/missing"), idContext("missing"))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.base.message).toBe("spin fixed cost not found")
  })
})

// ============================================================================
// PUT — period is immutable
// ============================================================================

describe("PUT /api/v1/finance/spin-fixed-costs/[id]", () => {
  it("does NOT forward `period` even when a tampered client sends it", async () => {
    updateSpinFixedCost.mockResolvedValue({ base: OK_BASE, data: SAMPLE_ROW })

    await updateRoute(
      jsonRequest("PUT", { id: "sfc-1", period: "209912", commonPoyDenier: 160, poyProduction: 3_000_000 }, "/sfc-1"),
      idContext("sfc-1")
    )

    const sent = updateSpinFixedCost.mock.calls[0][0]
    expect(sent).not.toHaveProperty("period")
    expect(Object.keys(sent)).not.toContain("period")
    expect(JSON.stringify(sent)).not.toContain("209912")
    expect(sent.id).toBe("sfc-1")
  })

  it("takes the id from the route, not the body", async () => {
    updateSpinFixedCost.mockResolvedValue({ base: OK_BASE, data: SAMPLE_ROW })

    await updateRoute(jsonRequest("PUT", { id: "spoofed", commonPoyDenier: 1 }, "/sfc-1"), idContext("sfc-1"))

    expect(updateSpinFixedCost.mock.calls[0][0].id).toBe("sfc-1")
  })

  it("forwards every mutable field, including explicit zeros on the four monthly costs", async () => {
    updateSpinFixedCost.mockResolvedValue({ base: OK_BASE, data: SAMPLE_ROW })

    await updateRoute(
      jsonRequest(
        "PUT",
        {
          commonPoyDenier: 150.5,
          poyProduction: 2_000_000,
          spinPowerMonth: 0,
          spinManpowerMonth: 0,
          spinOverheadsMonth: 0,
          spinConssprsMonth: 0,
          isActive: false,
        },
        "/sfc-1"
      ),
      idContext("sfc-1")
    )

    expect(updateSpinFixedCost.mock.calls[0][0]).toEqual({
      id: "sfc-1",
      commonPoyDenier: 150.5,
      poyProduction: 2_000_000,
      spinPowerMonth: 0,
      spinManpowerMonth: 0,
      spinOverheadsMonth: 0,
      spinConssprsMonth: 0,
      isActive: false,
    })
  })

  it("omits fields the client did not send (partial update)", async () => {
    updateSpinFixedCost.mockResolvedValue({ base: OK_BASE, data: SAMPLE_ROW })

    await updateRoute(jsonRequest("PUT", { isActive: true }, "/sfc-1"), idContext("sfc-1"))

    const sent = updateSpinFixedCost.mock.calls[0][0]
    expect(sent.isActive).toBe(true)
    expect(sent.commonPoyDenier).toBeUndefined()
    expect(sent.poyProduction).toBeUndefined()
  })

  it("passes the backend's deactivation refusal through verbatim", async () => {
    const refusal =
      "cannot deactivate the last active spin fixed cost: the calc engine would have no pool row for POY costing"
    updateSpinFixedCost.mockRejectedValue(grpcError(grpc.status.FAILED_PRECONDITION, refusal))

    const response = await updateRoute(jsonRequest("PUT", { isActive: false }, "/sfc-1"), idContext("sfc-1"))
    const body = await response.json()

    expect(body.base.message).toBe(refusal)
    expect(body.base.message).not.toContain("Failed to update")
  })
})

// ============================================================================
// DELETE — anchor-guard refusal must reach the UI verbatim
// ============================================================================

describe("DELETE /api/v1/finance/spin-fixed-costs/[id]", () => {
  it("forwards the id and returns the base envelope", async () => {
    deleteSpinFixedCost.mockResolvedValue({ base: { ...OK_BASE, message: "Spin Fixed Cost deleted" } })

    const response = await deleteRoute(getRequest("/sfc-1"), idContext("sfc-1"))
    const body = await response.json()

    expect(deleteSpinFixedCost.mock.calls[0][0]).toEqual({ id: "sfc-1" })
    expect(body.base.isSuccess).toBe(true)
  })

  it("passes the anchor-guard refusal through verbatim, not as a generic failure", async () => {
    const refusal =
      "cannot delete spin fixed cost 202604: it is the only pool row and the calc engine would have nothing to cost POY products against"
    deleteSpinFixedCost.mockRejectedValue(grpcError(grpc.status.FAILED_PRECONDITION, refusal))

    const response = await deleteRoute(getRequest("/sfc-1"), idContext("sfc-1"))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.base.isSuccess).toBe(false)
    expect(body.base.message).toBe(refusal)
    expect(body.base.message).not.toContain("Failed to delete spin fixed cost")
  })

  it("passes a non-success delete base through verbatim", async () => {
    const refusal = "cannot delete the last active pool row"
    deleteSpinFixedCost.mockResolvedValue({
      base: { isSuccess: false, statusCode: "400", message: refusal, validationErrors: [] },
    })

    const response = await deleteRoute(getRequest("/sfc-1"), idContext("sfc-1"))
    const body = await response.json()

    expect(body.base.message).toBe(refusal)
  })

  it("only falls back to the generic message for a non-gRPC failure", async () => {
    deleteSpinFixedCost.mockRejectedValue(new Error("socket hang up"))

    const response = await deleteRoute(getRequest("/sfc-1"), idContext("sfc-1"))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.base.message).toBe("Failed to delete spin fixed cost")
  })
})
