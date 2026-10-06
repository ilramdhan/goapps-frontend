// BFF route /api/v1/finance/erp-integration/batches/[batchId]/recon/export

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandleFile } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ batchId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    return erpHandleFile("export ERP recon", async () => {
        const { batchId } = await params
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.exportErpRecon({ batchId: Number(batchId) }, metadata)
    })
}
