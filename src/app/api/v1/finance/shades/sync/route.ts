// Finance Shade routes - Sync from Oracle
//
// POST /api/v1/finance/shades/sync - triggers SyncShades, which pulls the
// full shade master from MGTDAT.OM_GRADE_CODE_2 and upserts into
// cost_erp_shade, keyed on shade_code. Rows a finance user created or edited
// by hand (source MANUAL) are never overwritten — the backend's
// decideUpsertAction guarantees re-running this never duplicates data
// already saved in Postgres.

import { NextRequest, NextResponse } from "next/server"
import { getShadeClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function POST(request: NextRequest) {
    try {
        const metadata = createMetadataFromRequest(request)
        const client = getShadeClient()
        const response = await client.syncShades({}, metadata)

        return NextResponse.json({
            base: response.base,
            totalRows: response.totalRows,
            inserted: response.inserted,
            updated: response.updated,
            skipped: response.skipped,
            durationMs: response.durationMs,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error syncing shades:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to sync shades",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
