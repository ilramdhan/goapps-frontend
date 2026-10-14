// RM groups BFF — denierUseDraft forwarded on create/update and serialized (default false)
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const createRMGroup = vi.fn()
const updateRMGroup = vi.fn()

vi.mock("@/lib/grpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/grpc")>()
  return {
    ...actual,
    createMetadataFromRequest: () => ({ metadata: true }),
    getRmGroupClient: () => ({ createRMGroup, updateRMGroup }),
  }
})

import { POST } from "@/app/api/v1/finance/rm-groups/route"
import { PUT } from "@/app/api/v1/finance/rm-groups/[groupHeadId]/route"

const OK = { isSuccess: true, statusCode: "200", message: "OK", validationErrors: [] }
const req = (method: string, body: unknown) =>
  new NextRequest("http://localhost:3000/api/v1/finance/rm-groups", {
    method, body: JSON.stringify(body), headers: { "content-type": "application/json" },
  })

beforeEach(() => vi.clearAllMocks())

describe("rm-groups BFF denierUseDraft", () => {
  it("forwards on create and returns it", async () => {
    createRMGroup.mockResolvedValue({ base: OK, data: { groupHeadId: "g1", denierUseDraft: true } })
    const res = await POST(req("POST", { groupCode: "S", denier: 40, denierUseDraft: true }))
    expect(createRMGroup.mock.calls[0][0].denierUseDraft).toBe(true)
    expect((await res.json()).data.denierUseDraft).toBe(true)
  })

  it("forwards on update and defaults to false in response", async () => {
    updateRMGroup.mockResolvedValue({ base: OK, data: { groupHeadId: "g1" } })
    const res = await PUT(req("PUT", { period: "2026-09", denierUseDraft: false }), {
      params: Promise.resolve({ groupHeadId: "g1" }),
    } as never)
    expect(updateRMGroup.mock.calls[0][0]).toMatchObject({ groupHeadId: "g1", denierUseDraft: false })
    expect((await res.json()).data.denierUseDraft).toBe(false)
  })
})
