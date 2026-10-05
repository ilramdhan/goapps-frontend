// BFF route /api/v1/finance/erp-integration/adj-previews/[previewId]

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandle, erpPagination } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ previewId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    return erpHandle("get ERP ADJ preview", async () => {
        const { previewId } = await params
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.getErpAdjPreview({ previewId, pagination: erpPagination(request) }, metadata)
    })
}
