import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to get downtime reason", (c, m) =>
    c.getDowntimeReasonMaster({ reasonId: Number(id) }, m)
  )
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to update downtime reason", (c, m) =>
    c.updateDowntimeReasonMaster({ ...body, reasonId: Number(id) }, m)
  )
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to delete downtime reason", (c, m) =>
    c.deleteDowntimeReasonMaster({ reasonId: Number(id) }, m)
  )
}
