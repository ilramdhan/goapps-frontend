import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

export async function POST(request: NextRequest) {
  const body = await request.json()
  return ppcProxy(request, "Failed to pull from Orion", (c, m) => c.pullFromOrion(body, m))
}
