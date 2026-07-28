import { NextRequest } from "next/server"
import { ppcProxy } from "../_lib/proxy"

export async function POST(request: NextRequest) {
  const body = await request.json()
  return ppcProxy(request, "Failed to save area shift log", (c, m) => c.submitAreaShiftLog(body, m))
}
