import { NextRequest } from "next/server"
import { ppcProxy } from "../_lib/proxy"

// Two-part shift entry (positions + downtime + waste). status FINAL recomputes efficiency.
export async function POST(request: NextRequest) {
  const body = await request.json()
  return ppcProxy(request, "Failed to submit shift entry", (c, m) => c.submitShiftEntry(body, m))
}
