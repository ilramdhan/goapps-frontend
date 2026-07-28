import { NextRequest } from "next/server"
import { ppcProxy, page, pageSize, qStr, qInt } from "../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list thresholds", (c, m) =>
    c.listOverrunThresholdConfigs(
      {
        page: page(sp),
        pageSize: pageSize(sp),
        level: qInt(sp, "level", 0),
        activeFilter: qInt(sp, "activeFilter", 0, "active_filter"),
        sortBy: qStr(sp, "sortBy", "sort_by"),
        sortOrder: qStr(sp, "sortOrder", "sort_order"),
      },
      m
    )
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return ppcProxy(request, "Failed to create threshold", (c, m) => c.createOverrunThresholdConfig(body, m))
}
