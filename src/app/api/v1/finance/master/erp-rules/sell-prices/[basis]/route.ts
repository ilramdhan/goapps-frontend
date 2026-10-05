// BFF route /api/v1/finance/master/erp-rules/sell-prices/[basis]

import { NextRequest } from "next/server"
import { getErpRuleClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpBody, erpHandle } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ basis: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    return erpHandle("upsert sell price", async () => {
        const { basis } = await params
        const body = await erpBody(request)
        const metadata = createMetadataFromRequest(request)
        const client = getErpRuleClient()
        return client.upsertSellPrice({ basis, price: String(body.price ?? ""), isActive: typeof body.isActive === "boolean" ? body.isActive : undefined }, metadata)
    })
}
