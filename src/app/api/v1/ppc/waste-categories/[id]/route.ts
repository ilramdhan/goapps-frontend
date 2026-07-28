import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to get waste category", (c, m) =>
    c.getWasteCategoryMaster({ categoryId: Number(id) }, m)
  )
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to update waste category", (c, m) =>
    c.updateWasteCategoryMaster({ ...body, categoryId: Number(id) }, m)
  )
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to delete waste category", (c, m) =>
    c.deleteWasteCategoryMaster({ categoryId: Number(id) }, m)
  )
}
