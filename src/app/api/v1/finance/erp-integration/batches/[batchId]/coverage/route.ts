// BFF route /api/v1/finance/erp-integration/batches/[batchId]/coverage

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpEnum, erpHandle, erpPagination, erpQ } from "@/lib/grpc/erp-bff"
import { erpCoverageStatusFromJSON } from "@/types/generated/finance/v1/erp_integration"

interface RouteParams {
    params: Promise<{ batchId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    return erpHandle("list ERP coverage", async () => {
        const { batchId } = await params
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.listErpCoverage({ batchId: Number(batchId), status: erpEnum(erpCoverageStatusFromJSON, erpQ(request, "status")), search: erpQ(request, "search"), pagination: erpPagination(request) }, metadata)
    })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    return erpHandle("run ERP coverage", async () => {
        const { batchId } = await params
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.runErpCoverage({ batchId: Number(batchId) }, metadata)
    })
}
