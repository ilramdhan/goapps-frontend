// BFF route /api/v1/finance/erp-integration/attr-backfill

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpBody, erpHandle } from "@/lib/grpc/erp-bff"

export async function POST(request: NextRequest) {
    return erpHandle("run ERP attribute backfill", async () => {
        const body = await erpBody(request)
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.runErpAttributeBackfill({ dryRun: Boolean(body.dryRun) }, metadata)
    })
}
