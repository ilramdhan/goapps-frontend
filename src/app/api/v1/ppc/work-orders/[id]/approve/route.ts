import { NextRequest } from "next/server"
import { ppcProxy } from "../../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  return ppcProxy(request, "Failed to approve work order", (c, m) =>
    c.approveWO({ approvalSide: "PM", ...body, woId: Number(id) }, m)
  )
}
