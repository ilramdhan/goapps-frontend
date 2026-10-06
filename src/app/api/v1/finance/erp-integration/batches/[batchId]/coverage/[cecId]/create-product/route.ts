// BFF route /api/v1/finance/erp-integration/batches/[batchId]/coverage/[cecId]/create-product

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandle } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ batchId: string; cecId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    return erpHandle("create product from ERP demand", async () => {
        const { batchId, cecId } = await params
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.createCostProductFromDemand({ batchId: Number(batchId), cecId: Number(cecId) }, metadata)
    })
}
