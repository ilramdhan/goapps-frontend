// BFF route /api/v1/finance/erp-integration/batches/[batchId]/load-demand

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandle } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ batchId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    return erpHandle("load ERP demand", async () => {
        const { batchId } = await params
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.loadErpDemand({ batchId: Number(batchId) }, metadata)
    })
}
