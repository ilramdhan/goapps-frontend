// BFF route /api/v1/finance/master/erp-rules/sell-prices

import { NextRequest } from "next/server"
import { getErpRuleClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandle, erpPagination } from "@/lib/grpc/erp-bff"

export async function GET(request: NextRequest) {
    return erpHandle("list sell prices", async () => {
        const metadata = createMetadataFromRequest(request)
        const client = getErpRuleClient()
        return client.listSellPrices({ pagination: erpPagination(request) }, metadata)
    })
}
