// BFF route /api/v1/finance/erp-integration/config

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandle } from "@/lib/grpc/erp-bff"

export async function GET(request: NextRequest) {
    return erpHandle("get ERP integration config", async () => {
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.getErpIntegrationConfig({}, metadata)
    })
}
