// BFF route /api/v1/finance/master/erp-rules/grade-groups

import { NextRequest } from "next/server"
import { getErpRuleClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandle, erpPagination, erpQ } from "@/lib/grpc/erp-bff"

export async function GET(request: NextRequest) {
    return erpHandle("list grade groups", async () => {
        const metadata = createMetadataFromRequest(request)
        const client = getErpRuleClient()
        return client.listGradeGroups({ unassignedOnly: erpQ(request, "unassignedOnly") === "true", pagination: erpPagination(request) }, metadata)
    })
}
