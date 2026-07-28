import { NextRequest } from "next/server"
import { ppcProxy, page, pageSize, qStr, qInt, qIntOpt } from "../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list shift-log notes", (c, m) =>
    c.listShiftLogNotes(
      {
        page: page(sp),
        pageSize: pageSize(sp),
        machineId: qIntOpt(sp, "machineId", "machine_id"),
        date: qStr(sp, "date"),
        shift: qStr(sp, "shift"),
        noteType: qInt(sp, "noteType", 0, "note_type"),
        sortBy: qStr(sp, "sortBy", "sort_by"),
        sortOrder: qStr(sp, "sortOrder", "sort_order"),
      },
      m
    )
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return ppcProxy(request, "Failed to create shift-log note", (c, m) => c.createShiftLogNote(body, m))
}
