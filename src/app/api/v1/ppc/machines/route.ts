import { NextRequest } from "next/server"
import { ppcProxy, page, pageSize, qStr, qInt, qIntOpt } from "../_lib/proxy"

// Machine master is sync-sourced (read + local edit only) — no POST create.
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list machines", (c, m) =>
    c.listMachines(
      {
        page: page(sp),
        pageSize: pageSize(sp),
        search: qStr(sp, "search"),
        area: qInt(sp, "area", 0),
        machineGroupId: qIntOpt(sp, "machineGroupId", "machine_group_id"),
        activeFilter: qInt(sp, "activeFilter", 0, "active_filter"),
        sortBy: qStr(sp, "sortBy", "sort_by"),
        sortOrder: qStr(sp, "sortOrder", "sort_order"),
      },
      m
    )
  )
}
