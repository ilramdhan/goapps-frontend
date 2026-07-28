import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to get capacity", (c, m) =>
    c.getProductMachineCapacity({ capacityId: Number(id) }, m)
  )
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to update capacity", (c, m) =>
    c.updateProductMachineCapacity({ ...body, capacityId: Number(id) }, m)
  )
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to delete capacity", (c, m) =>
    c.deleteProductMachineCapacity({ capacityId: Number(id) }, m)
  )
}
