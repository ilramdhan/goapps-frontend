import { NextRequest } from "next/server"
import { ppcProxy, page, pageSize, qStr, qInt, qIntOpt } from "../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list machine shift logs", (c, m) =>
    c.listMachineShiftLogs(
      {
        page: page(sp),
        pageSize: pageSize(sp),
        machineId: qIntOpt(sp, "machineId", "machine_id"),
        area: qInt(sp, "area", 0),
        date: qStr(sp, "date"),
        shift: qStr(sp, "shift"),
        status: qStr(sp, "status"),
        sortBy: qStr(sp, "sortBy", "sort_by"),
        sortOrder: qStr(sp, "sortOrder", "sort_order"),
      },
      m
    )
  )
}
