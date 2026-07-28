import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to get product config", (c, m) =>
    c.getProductPPCConfig({ configId: Number(id) }, m)
  )
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to update product config", (c, m) =>
    c.updateProductPPCConfig({ ...body, configId: Number(id) }, m)
  )
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to delete product config", (c, m) =>
    c.deleteProductPPCConfig({ configId: Number(id) }, m)
  )
}
