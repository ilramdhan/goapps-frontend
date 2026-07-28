import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

// Lot master is keyed by lotNo (string PK).
export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to get lot", (c, m) => c.getLotMaster({ lotNo: decodeURIComponent(id) }, m))
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to update lot", (c, m) =>
    c.updateLotMaster({ ...body, lotNo: decodeURIComponent(id) }, m)
  )
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to delete lot", (c, m) =>
    c.deleteLotMaster({ lotNo: decodeURIComponent(id) }, m)
  )
}
