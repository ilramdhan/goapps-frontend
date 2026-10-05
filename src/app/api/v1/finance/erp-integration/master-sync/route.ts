// BFF route /api/v1/finance/erp-integration/master-sync

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandle } from "@/lib/grpc/erp-bff"

export async function POST(request: NextRequest) {
    return erpHandle("run ERP master sync", async () => {
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.runErpMasterSync({}, metadata)
    })
}
