import { NextRequest } from "next/server"
import { ppcProxy, page, pageSize, qStr, qBoolOpt } from "../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list sales orders", (c, m) =>
    c.listSalesOrderStaging(
      {
        page: page(sp),
        pageSize: pageSize(sp),
        search: qStr(sp, "search"),
        customerCode: qStr(sp, "customerCode", "customer_code"),
        itemCode: qStr(sp, "itemCode", "item_code"),
        // Default true: the staging list is the Pull-from-Orion LOV, so
        // already-pulled rows must not reappear and be pulled twice (G5).
        // An explicit `unpulledOnly=false` still opts into the full inbox.
        unpulledOnly: qBoolOpt(sp, "unpulledOnly", "unpulled_only") ?? true,
        sortBy: qStr(sp, "sortBy", "sort_by"),
        sortOrder: qStr(sp, "sortOrder", "sort_order"),
      },
      m
    )
  )
}
