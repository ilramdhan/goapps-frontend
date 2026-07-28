import { NextRequest } from "next/server"
import { ppcProxy } from "../../../_lib/proxy"

type Ctx = { params: Promise<{ sosId: string }> }

/**
 * POST persists a planner's manual product pick on a staging row. The row flips
 * to match_status MANUAL, so the next ETL resolution pass leaves it alone and
 * the pick survives beyond the browser session.
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  const { sosId } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to set staging product", (c, m) =>
    c.setStagingProduct({ ...body, sosId: Number(sosId) }, m)
  )
}
