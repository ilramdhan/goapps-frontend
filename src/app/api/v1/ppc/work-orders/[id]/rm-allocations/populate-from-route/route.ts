import { NextRequest } from "next/server"
import { ppcProxy } from "../../../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

// Read-only prefill: returns the RM allocation lines suggested by the product's
// released route, with labels already resolved. It never writes — the panel
// persists through PUT .../rm-allocations (replace=false is always sent).
export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to suggest RM allocations from route", (c, m) =>
    c.populateWORmFromRoute({ woId: Number(id), replace: false }, m)
  )
}
