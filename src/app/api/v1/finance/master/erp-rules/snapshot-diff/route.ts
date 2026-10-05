// BFF route /api/v1/finance/master/erp-rules/snapshot-diff

import { NextRequest } from "next/server"
import { getErpRuleClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpHandle, erpQ } from "@/lib/grpc/erp-bff"

export async function GET(request: NextRequest) {
    return erpHandle("get rule snapshot diff", async () => {
        const metadata = createMetadataFromRequest(request)
        const client = getErpRuleClient()
        return client.getRuleSnapshotDiff({ fromBatchId: Number(erpQ(request, "fromBatchId")) || 0, toBatchId: Number(erpQ(request, "toBatchId")) || 0 }, metadata)
    })
}
