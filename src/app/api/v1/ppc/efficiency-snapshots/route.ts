import { NextRequest } from "next/server"
import { ppcProxy, page, pageSize, qStr, qInt, qIntOpt } from "../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list efficiency snapshots", (c, m) =>
    c.listEfficiencySnapshots(
      {
        page: page(sp),
        pageSize: pageSize(sp),
        area: qInt(sp, "area", 0),
        scope: qStr(sp, "scope"),
        machineId: qIntOpt(sp, "machineId", "machine_id"),
        dateFrom: qStr(sp, "dateFrom", "date_from"),
        dateTo: qStr(sp, "dateTo", "date_to"),
        sortBy: qStr(sp, "sortBy", "sort_by"),
        sortOrder: qStr(sp, "sortOrder", "sort_order"),
      },
      m
    )
  )
}
