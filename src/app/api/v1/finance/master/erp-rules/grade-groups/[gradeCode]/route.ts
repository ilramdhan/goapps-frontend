// BFF route /api/v1/finance/master/erp-rules/grade-groups/[gradeCode]

import { NextRequest } from "next/server"
import { getErpRuleClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpBody, erpHandle } from "@/lib/grpc/erp-bff"

interface RouteParams {
    params: Promise<{ gradeCode: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    return erpHandle("assign grade group", async () => {
        const { gradeCode } = await params
        const body = await erpBody(request)
        const metadata = createMetadataFromRequest(request)
        const client = getErpRuleClient()
        return client.updateGradeGroup({ gradeCode, gradeGroup: String(body.gradeGroup ?? "") }, metadata)
    })
}
