import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  return ppcProxy(request, "Failed to get customer", (c, m) => c.getCustomer({ customerId: Number(id) }, m))
}

// The customer code is immutable — it is the key the Oracle sync upserts on.
export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to update customer", (c, m) =>
    c.updateCustomer({ ...body, customerId: Number(id) }, m)
  )
}
