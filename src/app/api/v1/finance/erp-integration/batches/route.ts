// BFF route /api/v1/finance/erp-integration/batches

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpBody, erpEnum, erpHandle, erpPagination, erpQ } from "@/lib/grpc/erp-bff"
import { erpBatchModeFromJSON, erpBatchStatusFromJSON } from "@/types/generated/finance/v1/erp_integration"

export async function GET(request: NextRequest) {
    return erpHandle("list ERP batches", async () => {
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.listErpBatches({ period: erpQ(request, "period"), status: erpEnum(erpBatchStatusFromJSON, erpQ(request, "status")), mode: erpEnum(erpBatchModeFromJSON, erpQ(request, "mode")), pagination: erpPagination(request) }, metadata)
    })
}

export async function POST(request: NextRequest) {
    return erpHandle("create ERP batch", async () => {
        const body = await erpBody(request)
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.createErpBatch({ period: String(body.period ?? ""), mode: erpEnum(erpBatchModeFromJSON, body.mode) }, metadata)
    })
}
