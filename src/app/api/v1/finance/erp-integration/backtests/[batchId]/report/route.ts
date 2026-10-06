// BFF route /api/v1/finance/erp-integration/backtests/[batchId]/report

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandle, erpPagination } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ batchId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    return erpHandle("get ERP backtest report", async () => {
        const { batchId } = await params
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.getErpBacktestReport({ batchId: Number(batchId), pagination: erpPagination(request) }, metadata)
    })
}
