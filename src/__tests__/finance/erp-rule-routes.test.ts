// ERP rule BFF routes — happy path, gRPC error mapping, BaseResponse passthrough
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import * as grpc from "@grpc/grpc-js"

const listValLossRules = vi.fn()
const updateValLossRule = vi.fn()
const exportErpRules = vi.fn()

vi.mock("@/lib/grpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/grpc")>()
  return {
    ...actual,
    createMetadataFromRequest: () => ({ metadata: true }),
    getErpRuleClient: () => ({ listValLossRules, updateValLossRule, exportErpRules }),
  }
})

import { GET as listRoute } from "@/app/api/v1/finance/master/erp-rules/valloss/route"
import { PUT as updateRoute } from "@/app/api/v1/finance/master/erp-rules/valloss/[id]/route"
import { GET as exportRoute } from "@/app/api/v1/finance/master/erp-rules/export/route"

const BASE = "http://localhost:3000/api/v1/finance/master/erp-rules"
const OK = { isSuccess: true, statusCode: "200", message: "OK", validationErrors: [] }
const grpcError = (code: number, details: string) =>
  Object.assign(new Error(details), { code, details, metadata: new grpc.Metadata() }) as grpc.ServiceError

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("erp-rules routes", () => {
  it("lists valloss rules", async () => {
    listValLossRules.mockResolvedValue({ base: OK, data: [{ id: 1 }] })
    const res = await listRoute(new NextRequest(`${BASE}/valloss?fgType=FG&isActive=true`))
    expect(res.status).toBe(200)
    expect(listValLossRules.mock.calls[0][0]).toMatchObject({ fgType: "FG", isActive: true })
  })

  it("maps a gRPC error on update", async () => {
    updateValLossRule.mockRejectedValue(grpcError(grpc.status.NOT_FOUND, "missing"))
    const req = new NextRequest(`${BASE}/valloss/5`, { method: "PUT", body: JSON.stringify({ valLoss: "1.5" }) })
    const res = await updateRoute(req, { params: Promise.resolve({ id: "5" }) })
    expect(res.status).toBe(404)
    expect(updateValLossRule.mock.calls[0][0].id).toBe(5)
  })

  it("passes a failed BaseResponse through on export", async () => {
    const base = { isSuccess: false, statusCode: "500", message: "boom", validationErrors: [] }
    exportErpRules.mockResolvedValue({ base, fileContent: new Uint8Array(0), fileName: "" })
    const res = await exportRoute(new NextRequest(`${BASE}/export`))
    expect((await res.json()).base).toEqual(base)
  })
})
