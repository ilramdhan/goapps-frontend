// BFF route /api/v1/finance/erp-integration/link-report

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandle, erpPagination } from "@/lib/grpc/erp-bff"

export async function GET(request: NextRequest) {
    return erpHandle("get ERP item link report", async () => {
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.getErpItemLinkReport({ pagination: erpPagination(request) }, metadata)
    })
}
