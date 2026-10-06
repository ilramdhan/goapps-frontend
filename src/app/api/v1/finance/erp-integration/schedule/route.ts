// BFF route /api/v1/finance/erp-integration/schedule

import { NextRequest } from "next/server"
import { getErpIntegrationClient, createMetadataFromRequest } from "@/lib/grpc"
import { erpBody, erpEnum, erpHandle } from "@/lib/grpc/erp-bff"
import { erpScheduleModeFromJSON } from "@/types/generated/finance/v1/erp_integration"

export async function GET(request: NextRequest) {
    return erpHandle("get ERP schedule", async () => {
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.getErpIntegrationSchedule({}, metadata)
    })
}

export async function PUT(request: NextRequest) {
    return erpHandle("update ERP schedule", async () => {
        const body = await erpBody(request)
        const metadata = createMetadataFromRequest(request)
        const client = getErpIntegrationClient()
        return client.updateErpIntegrationSchedule({ enabled: Boolean(body.enabled), cron: String(body.cron ?? ""), runDayOfMonth: Number(body.runDayOfMonth) || 0, runTime: String(body.runTime ?? ""), mode: erpEnum(erpScheduleModeFromJSON, scheduleMode(body.mode)), runDate: String(body.runDate ?? ""), timezone: String(body.timezone ?? "") }, metadata)
    })
}

/** Accepts the short name (CRON) or the full enum name; numbers pass through. */
function scheduleMode(v: unknown): unknown {
    return typeof v === "string" && /^[A-Z_]+$/.test(v) && !v.startsWith("ERP_SCHEDULE_MODE_") ? `ERP_SCHEDULE_MODE_${v}` : v
}
