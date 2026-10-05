// ERP integration BFF routes — happy path, gRPC error mapping, BaseResponse passthrough
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import * as grpc from "@grpc/grpc-js"

const listErpBatches = vi.fn()
const createErpBatch = vi.fn()
const pushErpBatch = vi.fn()
const executeErpAdjOperation = vi.fn()
const exportErpCoverage = vi.fn()

vi.mock("@/lib/grpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/grpc")>()
  return {
    ...actual,
    createMetadataFromRequest: () => ({ metadata: true }),
    getErpIntegrationClient: () => ({ listErpBatches, createErpBatch, pushErpBatch, executeErpAdjOperation, exportErpCoverage }),
  }
})

import { GET as listRoute, POST as createRoute } from "@/app/api/v1/finance/erp-integration/batches/route"
import { POST as pushRoute } from "@/app/api/v1/finance/erp-integration/batches/[batchId]/push/route"
import { POST as adjExecRoute } from "@/app/api/v1/finance/erp-integration/adj-previews/[previewId]/execute/route"
import { GET as exportRoute } from "@/app/api/v1/finance/erp-integration/batches/[batchId]/coverage/export/route"

const BASE = "http://localhost:3000/api/v1/finance/erp-integration"
const OK = { isSuccess: true, statusCode: "200", message: "OK", validationErrors: [] }
const json = (path: string, body: unknown) =>
  new NextRequest(`${BASE}${path}`, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } })
const grpcError = (code: number, details: string) =>
  Object.assign(new Error(details), { code, details, metadata: new grpc.Metadata() }) as grpc.ServiceError

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("erp-integration batches", () => {
  it("lists batches with query -> request mapping", async () => {
    listErpBatches.mockResolvedValue({ base: OK, data: [{ batchId: 1 }] })
    const res = await listRoute(new NextRequest(`${BASE}/batches?period=202604&page=2&pageSize=5`))
    expect(res.status).toBe(200)
    expect(listErpBatches.mock.calls[0][0]).toMatchObject({ period: "202604", pagination: { page: 2, pageSize: 5 } })
    expect((await res.json()).data).toHaveLength(1)
  })

  it("creates a batch", async () => {
    createErpBatch.mockResolvedValue({ base: OK, data: { batchId: 7 } })
    const res = await createRoute(json("/batches", { period: "202604", mode: "ERP_BATCH_MODE_LIVE" }))
    expect(res.status).toBe(200)
    expect(createErpBatch.mock.calls[0][0].period).toBe("202604")
  })

  it("maps a gRPC error to HTTP", async () => {
    createErpBatch.mockRejectedValue(grpcError(grpc.status.ALREADY_EXISTS, "batch in flight"))
    const res = await createRoute(json("/batches", { period: "202604" }))
    expect(res.status).toBe(409)
  })
})

describe("erp-integration push / adj / export", () => {
  it("push passes batchId as Number and confirmations", async () => {
    pushErpBatch.mockResolvedValue({ base: OK, jobId: "j1", batchId: 3 })
    const res = await pushRoute(json("/batches/3/push", { confirmRowCount: 10, confirmSumStd: "12.5" }), {
      params: Promise.resolve({ batchId: "3" }),
    })
    expect(res.status).toBe(200)
    expect(pushErpBatch.mock.calls[0][0]).toEqual({ batchId: 3, confirmRowCount: 10, confirmSumStd: "12.5" })
  })

  it("passes a failed BaseResponse through verbatim", async () => {
    const base = { isSuccess: false, statusCode: "412", message: "hash mismatch", validationErrors: [] }
    executeErpAdjOperation.mockResolvedValue({ base })
    const res = await adjExecRoute(json("/adj-previews/p1/execute", { confirmSetHash: "x", confirmText: "y" }), {
      params: Promise.resolve({ previewId: "p1" }),
    })
    expect((await res.json()).base).toEqual(base)
  })

  it("exports coverage as a binary file", async () => {
    exportErpCoverage.mockResolvedValue({ base: OK, fileContent: new Uint8Array([1, 2, 3]), fileName: "cov.xlsx" })
    const res = await exportRoute(new NextRequest(`${BASE}/batches/3/coverage/export`), { params: Promise.resolve({ batchId: "3" }) })
    expect(res.headers.get("Content-Disposition")).toContain("cov.xlsx")
    expect((await res.arrayBuffer()).byteLength).toBe(3)
  })

  it("maps export gRPC error", async () => {
    exportErpCoverage.mockRejectedValue(grpcError(grpc.status.NOT_FOUND, "no batch"))
    const res = await exportRoute(new NextRequest(`${BASE}/batches/9/coverage/export`), { params: Promise.resolve({ batchId: "9" }) })
    expect(res.status).toBe(404)
  })
})
