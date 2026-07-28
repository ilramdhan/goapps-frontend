import { NextRequest } from "next/server"
import { ppcProxy, page, pageSize, qStr } from "../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list lots", (c, m) =>
    c.listLotMasters(
      {
        page: page(sp),
        pageSize: pageSize(sp),
        search: qStr(sp, "search"),
        itemCode: qStr(sp, "itemCode", "item_code"),
        shadeCode: qStr(sp, "shadeCode", "shade_code"),
        source: qStr(sp, "source"),
        prodType: qStr(sp, "prodType", "prod_type"),
        sortBy: qStr(sp, "sortBy", "sort_by"),
        sortOrder: qStr(sp, "sortOrder", "sort_order"),
      },
      m
    )
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return ppcProxy(request, "Failed to create lot", (c, m) => c.createLotMaster(body, m))
}
