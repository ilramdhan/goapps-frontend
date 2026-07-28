import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to get parameter", (c, m) =>
    c.getProductMachineParameter({ pmpId: Number(id) }, m)
  )
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to update parameter", (c, m) =>
    c.updateProductMachineParameter({ ...body, pmpId: Number(id) }, m)
  )
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to delete parameter", (c, m) =>
    c.deleteProductMachineParameter({ pmpId: Number(id) }, m)
  )
}
