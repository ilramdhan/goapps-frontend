import { NextRequest } from "next/server"
import { ppcProxy, qStr, qInt, qBoolOpt } from "../../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to get daily performance", (c, m) =>
    c.getDailyPerformance(
      { date: qStr(sp, "date"), area: qInt(sp, "area", 0), excluding: qBoolOpt(sp, "excluding") },
      m
    )
  )
}
