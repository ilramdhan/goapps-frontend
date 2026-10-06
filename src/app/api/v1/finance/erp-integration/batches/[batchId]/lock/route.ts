// BFF route /api/v1/finance/erp-integration/batches/[batchId]/lock

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandle } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ batchId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    return erpHandle("lock ERP batch", async () => {
        const { batchId } = await params
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.lockErpBatch({ batchId: Number(batchId) }, metadata)
    })
}
