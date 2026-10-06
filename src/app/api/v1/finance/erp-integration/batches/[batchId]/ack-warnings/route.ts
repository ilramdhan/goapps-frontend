// BFF route /api/v1/finance/erp-integration/batches/[batchId]/ack-warnings

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpBody, erpHandle } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ batchId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    return erpHandle("acknowledge ERP warnings", async () => {
        const { batchId } = await params
        const body = await erpBody(request)
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.ackErpWarnings({ batchId: Number(batchId), reason: String(body.reason ?? ""), warningSetHash: String(body.warningSetHash ?? "") }, metadata)
    })
}
