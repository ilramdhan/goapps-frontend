// BFF route /api/v1/finance/erp-integration/backtests

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpBody, erpHandle } from "@/lib/grpc/erp-bff"

export async function POST(request: NextRequest) {
    return erpHandle("run ERP backtest", async () => {
        const body = await erpBody(request)
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.runErpBacktest({ period: String(body.period ?? "") }, metadata)
    })
}
