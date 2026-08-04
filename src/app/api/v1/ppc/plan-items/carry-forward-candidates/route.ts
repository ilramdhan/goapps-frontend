import { NextRequest } from "next/server"
import { ppcProxy, qStr } from "../../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list plan carry-forward candidates", (c, m) =>
    c.listPlanCarryForwardCandidates(
      {
        sourceMonth: qStr(sp, "sourceMonth", "source_month"),
        // Required by the backend: whether a candidate has already been carried
        // can only be answered against a specific target month.
        targetMonth: qStr(sp, "targetMonth", "target_month"),
      },
      m
    )
  )
}
