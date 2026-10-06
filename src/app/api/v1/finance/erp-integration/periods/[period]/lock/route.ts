// BFF route /api/v1/finance/erp-integration/periods/[period]/lock

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpBody, erpHandle } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ period: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    return erpHandle("get ERP period lock", async () => {
        const { period } = await params
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.getErpPeriodLock({ period }, metadata)
    })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    return erpHandle("lock ERP period", async () => {
        const { period } = await params
        const body = await erpBody(request)
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.lockErpPeriod({ period, reason: String(body.reason ?? "") }, metadata)
    })
}
