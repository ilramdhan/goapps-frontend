import { NextRequest } from "next/server"
import { ppcProxy } from "../../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

// Save PPC-proposed parameter values for the WO.
export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to save parameters", (c, m) =>
    c.saveWOParameters({ ...body, woId: Number(id) }, m)
  )
}
