import { NextRequest } from "next/server"
import { ppcProxy, qStr, qInt } from "../../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to get morning review", (c, m) =>
    c.getMorningReview({ date: qStr(sp, "date"), area: qInt(sp, "area", 0) }, m)
  )
}
