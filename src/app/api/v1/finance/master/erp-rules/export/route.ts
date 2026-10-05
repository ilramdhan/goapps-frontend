// BFF route /api/v1/finance/master/erp-rules/export

import { NextRequest } from "next/server"
import { getErpRuleClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandleFile } from "@/lib/grpc/erp-bff"

export async function GET(request: NextRequest) {
    return erpHandleFile("export ERP rules", async () => {
        const metadata = createMetadataFromRequest(request)
        const client = getErpRuleClient()
        return client.exportErpRules({}, metadata)
    })
}
