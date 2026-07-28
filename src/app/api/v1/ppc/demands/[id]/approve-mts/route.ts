import { NextRequest } from "next/server"
import { ppcProxy } from "../../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to approve MTS demand", (c, m) =>
    c.approveMTSDemand({ ...body, demandId: Number(id) }, m)
  )
}
