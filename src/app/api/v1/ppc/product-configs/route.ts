import { NextRequest } from "next/server"
import { ppcProxy, page, pageSize, qStr, qBoolOpt } from "../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list product configs", (c, m) =>
    c.listProductPPCConfigs(
      {
        page: page(sp),
        pageSize: pageSize(sp),
        search: qStr(sp, "search"),
        commodityWatchOnly: qBoolOpt(sp, "commodityWatchOnly"),
        sortBy: qStr(sp, "sortBy", "sort_by"),
        sortOrder: qStr(sp, "sortOrder", "sort_order"),
      },
      m
    )
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return ppcProxy(request, "Failed to create product config", (c, m) => c.createProductPPCConfig(body, m))
}
