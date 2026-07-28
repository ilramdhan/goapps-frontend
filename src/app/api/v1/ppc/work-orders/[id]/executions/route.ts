import { NextRequest } from "next/server"
import { ppcProxy, qStr } from "../../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to list executions", (c, m) =>
    c.listWOExecutions(
      { woId: Number(id), date: qStr(sp, "date") || undefined, shift: qStr(sp, "shift") || undefined },
      m
    )
  )
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to save execution", (c, m) =>
    c.saveWOExecution({ ...body, woId: Number(id) }, m)
  )
}
