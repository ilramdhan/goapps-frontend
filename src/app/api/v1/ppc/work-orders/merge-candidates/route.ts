import { NextRequest } from "next/server"
import { ppcProxy, qInt } from "../../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list merge candidates", (c, m) =>
    c.listMergeCandidates(
      {
        anchorPlanItemId: qInt(sp, "anchorPlanItemId", 0, "anchor_plan_item_id"),
        windowDays: qInt(sp, "windowDays", 0, "window_days"),
      },
      m
    )
  )
}
