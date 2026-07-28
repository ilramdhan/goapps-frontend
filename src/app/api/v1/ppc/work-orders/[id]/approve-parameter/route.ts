import { NextRequest } from "next/server"
import { ppcProxy } from "../../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

// PC approval — confirms PC parameter values (sequential PC → PM).
export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  return ppcProxy(request, "Failed to approve parameters", (c, m) =>
    c.approveWOParameter({ pcValues: [], ...body, woId: Number(id) }, m)
  )
}
