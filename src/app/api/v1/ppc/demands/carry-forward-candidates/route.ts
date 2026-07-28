import { NextRequest } from "next/server"
import { ppcProxy, qStr } from "../../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list carry-forward candidates", (c, m) =>
    c.listCarryForwardCandidates({ sourceMonth: qStr(sp, "sourceMonth", "source_month") }, m)
  )
}
