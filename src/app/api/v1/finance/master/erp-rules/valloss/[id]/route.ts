// BFF route /api/v1/finance/master/erp-rules/valloss/[id]

import { NextRequest } from "next/server"
import { getErpRuleClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpBody, erpHandle } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    return erpHandle("update valloss rule", async () => {
        const { id } = await params
        const body = await erpBody(request)
        const metadata = createMetadataFromRequest(request)
        const client = getErpRuleClient()
        return client.updateValLossRule({ id: Number(id), valLoss: String(body.valLoss ?? ""), isActive: typeof body.isActive === "boolean" ? body.isActive : undefined }, metadata)
    })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    return erpHandle("delete valloss rule", async () => {
        const { id } = await params
        const metadata = createMetadataFromRequest(request)
        const client = getErpRuleClient()
        return client.deleteValLossRule({ id: Number(id) }, metadata)
    })
}
