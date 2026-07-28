import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to get plan item", (c, m) => c.getPlanItem({ planItemId: Number(id) }, m))
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to update plan item", (c, m) =>
    c.updatePlanItem({ ...body, planItemId: Number(id) }, m)
  )
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to delete plan item", (c, m) =>
    c.deletePlanItem({ planItemId: Number(id) }, m)
  )
}
