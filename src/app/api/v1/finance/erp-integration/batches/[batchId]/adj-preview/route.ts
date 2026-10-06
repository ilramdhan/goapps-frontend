// BFF route /api/v1/finance/erp-integration/batches/[batchId]/adj-preview

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpBody, erpEnum, erpHandle } from "@/lib/grpc/erp-bff"
import { erpAdjOperationFromJSON } from "@/types/generated/finance/v1/erp_integration"

interface RouteParams {
    params: Promise<{ batchId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    return erpHandle("preview ERP ADJ operation", async () => {
        const { batchId } = await params
        const body = await erpBody(request)
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.previewErpAdjOperation({ batchId: Number(batchId), operation: erpEnum(erpAdjOperationFromJSON, body.operation) }, metadata)
    })
}
