import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to get machine", (c, m) => c.getMachine({ machineId: Number(id) }, m))
}

// Local edit only (line, group, doff weight, active, orion code).
export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to update machine", (c, m) =>
    c.updateMachine({ ...body, machineId: Number(id) }, m)
  )
}
