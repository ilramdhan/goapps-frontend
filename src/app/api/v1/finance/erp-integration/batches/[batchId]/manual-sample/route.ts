// BFF route /api/v1/finance/erp-integration/batches/[batchId]/manual-sample

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandleFile } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ batchId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    return erpHandleFile("export ERP manual sample", async () => {
        const { batchId } = await params
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.exportErpManualSample({ batchId: Number(batchId) }, metadata)
    })
}
