// MB Heads export BFF routes — /api/v1/finance/mb-heads/export and .../export-full
//
// Covers the `includeRejected` wiring (audit opt-in to include REJECTED MB Heads):
//   1. Default-safe: an absent param MUST forward includeRejected: false.
//   2. An explicit "true" MUST forward includeRejected: true.
//   3. An explicit "false" MUST still forward includeRejected: false (guards against a
//      naive Boolean(param) implementation, where the non-empty string "false" is truthy).
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ─── gRPC client mock ────────────────────────────────────────────────────────

const exportMBHeads = vi.fn()
const exportMBRecipeFull = vi.fn()

vi.mock("@/lib/grpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/grpc")>()
  return {
    ...actual,
    createMetadataFromRequest: () => ({ metadata: true }),
    getMBHeadClient: () => ({
      exportMBHeads,
      exportMBRecipeFull,
    }),
  }
})

// ─── Modules under test (imported after the mock is registered) ──────────────

import { GET as exportRoute } from "@/app/api/v1/finance/mb-heads/export/route"
import { GET as exportFullRoute } from "@/app/api/v1/finance/mb-heads/export-full/route"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRequest(base: string, query = "") {
  return new NextRequest(`${base}${query}`, { method: "GET" })
}

const OK_BASE = { isSuccess: true, statusCode: "200", message: "OK", validationErrors: [] }

const okEnvelope = () => ({
  base: OK_BASE,
  fileContent: new Uint8Array([1, 2, 3]),
  fileName: "export.xlsx",
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  exportMBHeads.mockResolvedValue(okEnvelope())
  exportMBRecipeFull.mockResolvedValue(okEnvelope())
})

// ============================================================================
// GET /api/v1/finance/mb-heads/export
// ============================================================================

describe("GET /api/v1/finance/mb-heads/export — includeRejected", () => {
  const BASE_URL = "http://localhost:3000/api/v1/finance/mb-heads/export"

  it("defaults to includeRejected: false when the param is absent", async () => {
    await exportRoute(getRequest(BASE_URL))

    expect(exportMBHeads.mock.calls[0][0]).toMatchObject({ includeRejected: false })
  })

  it("forwards includeRejected: true for an explicit 'true'", async () => {
    await exportRoute(getRequest(BASE_URL, "?includeRejected=true"))

    expect(exportMBHeads.mock.calls[0][0]).toMatchObject({ includeRejected: true })
  })

  it("forwards includeRejected: true for an explicit '1'", async () => {
    await exportRoute(getRequest(BASE_URL, "?includeRejected=1"))

    expect(exportMBHeads.mock.calls[0][0]).toMatchObject({ includeRejected: true })
  })

  it("still forwards includeRejected: false for an explicit 'false' string", async () => {
    // Guards against a naive Boolean(param) bug: the non-empty string "false" is
    // truthy in JS, so this must be handled via an explicit comparison instead.
    await exportRoute(getRequest(BASE_URL, "?includeRejected=false"))

    expect(exportMBHeads.mock.calls[0][0]).toMatchObject({ includeRejected: false })
  })

  it("accepts the snake_case query param too", async () => {
    await exportRoute(getRequest(BASE_URL, "?include_rejected=true"))

    expect(exportMBHeads.mock.calls[0][0]).toMatchObject({ includeRejected: true })
  })

  it("ignores garbage values and stays false", async () => {
    await exportRoute(getRequest(BASE_URL, "?includeRejected=yes"))

    expect(exportMBHeads.mock.calls[0][0]).toMatchObject({ includeRejected: false })
  })
})

// ============================================================================
// GET /api/v1/finance/mb-heads/export-full
// ============================================================================

describe("GET /api/v1/finance/mb-heads/export-full — includeRejected", () => {
  const BASE_URL = "http://localhost:3000/api/v1/finance/mb-heads/export-full"

  it("defaults to includeRejected: false when the param is absent", async () => {
    await exportFullRoute(getRequest(BASE_URL))

    expect(exportMBRecipeFull.mock.calls[0][0]).toMatchObject({ includeRejected: false })
  })

  it("forwards includeRejected: true for an explicit 'true'", async () => {
    await exportFullRoute(getRequest(BASE_URL, "?includeRejected=true"))

    expect(exportMBRecipeFull.mock.calls[0][0]).toMatchObject({ includeRejected: true })
  })

  it("still forwards includeRejected: false for an explicit 'false' string", async () => {
    await exportFullRoute(getRequest(BASE_URL, "?includeRejected=false"))

    expect(exportMBRecipeFull.mock.calls[0][0]).toMatchObject({ includeRejected: false })
  })

  it("accepts the snake_case query param too", async () => {
    await exportFullRoute(getRequest(BASE_URL, "?include_rejected=1"))

    expect(exportMBRecipeFull.mock.calls[0][0]).toMatchObject({ includeRejected: true })
  })

  it("does not disturb the other export-full params when includeRejected is added", async () => {
    await exportFullRoute(
      getRequest(BASE_URL, "?period=202607&costType=SELLING&checkStatusCalc=Approved&includeRejected=true")
    )

    expect(exportMBRecipeFull.mock.calls[0][0]).toEqual({
      activeFilter: 0,
      period: "202607",
      costType: "SELLING",
      checkStatusCalc: "Approved",
      includeRejected: true,
    })
  })
})
