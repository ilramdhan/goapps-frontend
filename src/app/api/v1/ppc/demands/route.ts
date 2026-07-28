import { NextRequest } from "next/server"
import { ppcProxy, page, pageSize, qStr, qInt, qIntOpt, qBoolOpt } from "../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list demands", (c, m) =>
    c.listDemands(
      {
        page: page(sp),
        pageSize: pageSize(sp),
        search: qStr(sp, "search"),
        type: qInt(sp, "type", 0),
        status: qInt(sp, "status", 0),
        month: qStr(sp, "month"),
        cpmProductSysId: qIntOpt(sp, "cpmProductSysId", "cpm_product_sys_id"),
        // Opt-in only (the plan-item dialog sets it); the demand list itself
        // must keep showing demands that are already planned.
        withoutPlan: qBoolOpt(sp, "withoutPlan", "without_plan"),
        sortBy: qStr(sp, "sortBy", "sort_by"),
        sortOrder: qStr(sp, "sortOrder", "sort_order"),
      },
      m
    )
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return ppcProxy(request, "Failed to create demand", (c, m) => c.createDemand(body, m))
}
