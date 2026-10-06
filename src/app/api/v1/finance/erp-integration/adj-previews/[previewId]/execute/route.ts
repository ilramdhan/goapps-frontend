// BFF route /api/v1/finance/erp-integration/adj-previews/[previewId]/execute

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpBody, erpHandle } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ previewId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    return erpHandle("execute ERP ADJ operation", async () => {
        const { previewId } = await params
        const body = await erpBody(request)
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.executeErpAdjOperation({ previewId, confirmSetHash: String(body.confirmSetHash ?? ""), confirmText: String(body.confirmText ?? "") }, metadata)
    })
}
