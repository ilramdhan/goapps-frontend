import { NextRequest } from "next/server"
import { ppcProxy, page, pageSize, qStr, qInt, qIntOpt } from "../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list work orders", (c, m) =>
    c.listWorkOrders(
      {
        page: page(sp),
        pageSize: pageSize(sp),
        search: qStr(sp, "search"),
        area: qInt(sp, "area", 0),
        status: qInt(sp, "status", 0),
        machineId: qIntOpt(sp, "machineId", "machine_id"),
        planItemId: qIntOpt(sp, "planItemId", "plan_item_id"),
        demandId: qIntOpt(sp, "demandId", "demand_id"),
        lotNo: qStr(sp, "lotNo", "lot_no"),
        sortBy: qStr(sp, "sortBy", "sort_by"),
        sortOrder: qStr(sp, "sortOrder", "sort_order"),
      },
      m
    )
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return ppcProxy(request, "Failed to create work order", (c, m) => c.createWorkOrder(body, m))
}
