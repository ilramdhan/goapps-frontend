// BFF route /api/v1/finance/erp-integration/batches/[batchId]/oracle-calls

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandle, erpPagination } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ batchId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    return erpHandle("list ERP oracle calls", async () => {
        const { batchId } = await params
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.listErpOracleCalls({ batchId: Number(batchId), pagination: erpPagination(request) }, metadata)
    })
}
