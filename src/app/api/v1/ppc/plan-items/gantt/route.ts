import { NextRequest } from "next/server"
import { ppcProxy, qStr, qInt, qIntOpt } from "../../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to get Gantt view", (c, m) =>
    c.getGanttView(
      {
        month: qStr(sp, "month"),
        area: qInt(sp, "area", 0),
        machineGroupId: qIntOpt(sp, "machineGroupId", "machine_group_id"),
        fromDate: qStr(sp, "fromDate", "from_date") || undefined,
        toDate: qStr(sp, "toDate", "to_date") || undefined,
      },
      m
    )
  )
}
