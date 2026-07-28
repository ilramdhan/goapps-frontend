import { NextRequest } from "next/server"
import { ppcProxy, page, pageSize, qInt } from "../_lib/proxy"

// PPC shift master (code + name + HH:MM window). Read-only picker source.
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list PPC shifts", (c, m) =>
    c.listPpcShifts(
      {
        page: page(sp),
        pageSize: pageSize(sp),
        activeFilter: qInt(sp, "activeFilter", 1, "active_filter"),
      },
      m
    )
  )
}
