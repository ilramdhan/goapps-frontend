import { NextRequest } from "next/server"

import { ppcProxy, qStr, qBoolOpt } from "../../_lib/proxy"

/**
 * GET the ids of every staging row matching a filter (server-capped), backing
 * the Pull-from-Orion LOV's "select all matching". Deliberately separate from
 * the display list: that one is page-capped at 100 rows, which would silently
 * truncate a select-all.
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list matching sales orders", (c, m) =>
    c.listSalesOrderStagingIds(
      {
        search: qStr(sp, "search"),
        customerCode: qStr(sp, "customerCode", "customer_code"),
        itemCode: qStr(sp, "itemCode", "item_code"),
        unpulledOnly: qBoolOpt(sp, "unpulledOnly", "unpulled_only") ?? true,
      },
      m
    )
  )
}
