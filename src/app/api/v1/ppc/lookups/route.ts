import { NextRequest } from "next/server"
import { ppcProxy, page, pageSize, qStr, qInt } from "../_lib/proxy"

// PPC lookup values (area / demand-type / grade-req / … — {code,label}).
// Callers filter by `category`; empty category returns all.
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list PPC lookups", (c, m) =>
    c.listPpcLookups(
      {
        page: page(sp),
        pageSize: pageSize(sp),
        category: qStr(sp, "category"),
        search: qStr(sp, "search"),
        activeFilter: qInt(sp, "activeFilter", 1, "active_filter"),
      },
      m
    )
  )
}
