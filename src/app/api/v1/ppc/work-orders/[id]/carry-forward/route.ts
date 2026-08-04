import { NextRequest } from "next/server"
import { ppcProxy } from "../../../_lib/proxy"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await request.json()
  return ppcProxy(request, "Failed to process WO carry-forward", (c, m) =>
    c.processWorkOrderCarryForward(
      {
        sourceWoId: Number(id),
        targetMonth: body.target_month ?? "",
        lotNo: body.lot_no ?? "",
        carryQty: body.carry_qty ?? "",
      },
      m
    )
  )
}
