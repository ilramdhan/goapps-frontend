// BFF route /api/v1/finance/erp-integration/batches/[batchId]/std-cost

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpEnum, erpHandle, erpPagination, erpQ } from "@/lib/grpc/erp-bff"
import { erpStdSourceFromJSON, erpReconStatusFromJSON } from "@/types/generated/finance/v1/erp_integration"

interface RouteParams {
    params: Promise<{ batchId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    return erpHandle("list ERP std cost", async () => {
        const { batchId } = await params
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.listErpStdCost({ batchId: Number(batchId), source: erpEnum(erpStdSourceFromJSON, erpQ(request, "source")), reconStatus: erpEnum(erpReconStatusFromJSON, erpQ(request, "reconStatus")), basis: erpQ(request, "basis"), status: erpQ(request, "status"), pagination: erpPagination(request) }, metadata)
    })
}
