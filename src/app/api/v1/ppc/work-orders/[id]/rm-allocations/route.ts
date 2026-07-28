import { NextRequest } from "next/server"
import { ppcProxy } from "../../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to save RM allocations", (c, m) =>
    c.saveWORmAllocations({ ...body, woId: Number(id) }, m)
  )
}
