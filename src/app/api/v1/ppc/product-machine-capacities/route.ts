import { NextRequest } from "next/server"
import { ppcProxy, page, pageSize, qStr, qIntOpt } from "../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list capacities", (c, m) =>
    c.listProductMachineCapacities(
      {
        page: page(sp),
        pageSize: pageSize(sp),
        cpmProductSysId: qIntOpt(sp, "cpmProductSysId", "cpm_product_sys_id"),
        machineId: qIntOpt(sp, "machineId", "machine_id"),
        sortBy: qStr(sp, "sortBy", "sort_by"),
        sortOrder: qStr(sp, "sortOrder", "sort_order"),
      },
      m
    )
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return ppcProxy(request, "Failed to create capacity", (c, m) => c.createProductMachineCapacity(body, m))
}
