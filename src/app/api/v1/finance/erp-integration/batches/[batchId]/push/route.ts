// BFF route /api/v1/finance/erp-integration/batches/[batchId]/push

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpBody, erpHandle } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ batchId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    return erpHandle("push ERP batch", async () => {
        const { batchId } = await params
        const body = await erpBody(request)
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.pushErpBatch({ batchId: Number(batchId), confirmRowCount: Number(body.confirmRowCount) || 0, confirmSumStd: String(body.confirmSumStd ?? "") }, metadata)
    })
}
