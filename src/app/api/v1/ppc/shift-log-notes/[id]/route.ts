import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to get shift-log note", (c, m) =>
    c.getShiftLogNote({ noteId: Number(id) }, m)
  )
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to update shift-log note", (c, m) =>
    c.updateShiftLogNote({ ...body, noteId: Number(id) }, m)
  )
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to delete shift-log note", (c, m) =>
    c.deleteShiftLogNote({ noteId: Number(id) }, m)
  )
}
