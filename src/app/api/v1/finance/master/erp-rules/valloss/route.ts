// BFF route /api/v1/finance/master/erp-rules/valloss

import { NextRequest } from "next/server"
import { getErpRuleClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpBody, erpHandle, erpPagination, erpQ } from "@/lib/grpc/erp-bff"

export async function GET(request: NextRequest) {
    return erpHandle("list valloss rules", async () => {
        const metadata = createMetadataFromRequest(request)
        const client = getErpRuleClient()
        return client.listValLossRules({ fgType: erpQ(request, "fgType"), prodType: erpQ(request, "prodType"), gradeGroup: erpQ(request, "gradeGroup"), isActive: erpQ(request, "isActive") ? erpQ(request, "isActive") === "true" : undefined, pagination: erpPagination(request) }, metadata)
    })
}

export async function POST(request: NextRequest) {
    return erpHandle("create valloss rule", async () => {
        const body = await erpBody(request)
        const metadata = createMetadataFromRequest(request)
        const client = getErpRuleClient()
        return client.createValLossRule({ fgType: String(body.fgType ?? ""), prodType: String(body.prodType ?? ""), gradeGroup: String(body.gradeGroup ?? ""), basis: String(body.basis ?? ""), valLoss: String(body.valLoss ?? "") }, metadata)
    })
}
