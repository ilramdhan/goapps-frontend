// BFF route /api/v1/finance/erp-integration/periods/[period]/currency-sanity

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandle } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ period: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    return erpHandle("get ERP currency sanity", async () => {
        const { period } = await params
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.getErpCurrencySanity({ period }, metadata)
    })
}
