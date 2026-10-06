// BFF route /api/v1/finance/erp-integration/batches/[batchId]/push/preview

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandle } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ batchId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    return erpHandle("preview ERP push", async () => {
        const { batchId } = await params
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.previewErpPush({ batchId: Number(batchId) }, metadata)
    })
}
