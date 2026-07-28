import { NextRequest } from "next/server"
import { ppcProxy, page, pageSize, qStr, qInt, qIntOpt } from "../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list plan items", (c, m) =>
    c.listPlanItems(
      {
        page: page(sp),
        pageSize: pageSize(sp),
        search: qStr(sp, "search"),
        month: qStr(sp, "month"),
        type: qInt(sp, "type", 0),
        status: qInt(sp, "status", 0),
        machineGroupId: qIntOpt(sp, "machineGroupId", "machine_group_id"),
        demandId: qIntOpt(sp, "demandId", "demand_id"),
        sortBy: qStr(sp, "sortBy", "sort_by"),
        sortOrder: qStr(sp, "sortOrder", "sort_order"),
      },
      m
    )
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return ppcProxy(request, "Failed to create plan item", (c, m) => c.createPlanItem(body, m))
}
