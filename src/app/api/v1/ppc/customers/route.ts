import { NextRequest } from "next/server"
import { ppcProxy, page, pageSize, qStr, qInt } from "../_lib/proxy"

// Customer master is sync-sourced from Orion OM_CUSTOMER but also accepts
// hand-added rows, so unlike machines this one does have a POST create.
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list customers", (c, m) =>
    c.listCustomers(
      {
        page: page(sp),
        pageSize: pageSize(sp),
        search: qStr(sp, "search"),
        activeFilter: qInt(sp, "activeFilter", 0, "active_filter"),
        customerSource: qStr(sp, "customerSource", "customer_source"),
        sortBy: qStr(sp, "sortBy", "sort_by"),
        sortOrder: qStr(sp, "sortOrder", "sort_order"),
      },
      m
    )
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return ppcProxy(request, "Failed to create customer", (c, m) => c.createCustomer(body, m))
}
