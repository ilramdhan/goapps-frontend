// BFF route /api/v1/finance/erp-integration/links

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpBody, erpHandle } from "@/lib/grpc/erp-bff"

export async function POST(request: NextRequest) {
    return erpHandle("link ERP to product", async () => {
        const body = await erpBody(request)
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.linkErpToProduct({ productSysId: Number(body.productSysId) || 0, erpItemCode: String(body.erpItemCode ?? "") }, metadata)
    })
}
