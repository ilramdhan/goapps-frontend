import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

export async function POST(request: NextRequest) {
  const body = await request.json()
  return ppcProxy(request, "Failed to process plan carry-forward", (c, m) =>
    c.processPlanCarryForward(body, m)
  )
}
