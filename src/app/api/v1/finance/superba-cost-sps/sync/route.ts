// Finance Superba Cost SP routes - Sync from legacy source
//
// POST /api/v1/finance/superba-cost-sps/sync triggers SyncSuperbaCostSps. Until
// the legacy source is configured the backend answers "not configured"
// (FAILED_PRECONDITION / UNIMPLEMENTED / ALREADY_EXISTS-409, or a BaseResponse
// with isSuccess=false). This is NOT a crash: the BFF returns HTTP 200 with
// base.isSuccess=false and the backend message so the UI shows an info toast.

import * as grpc from "@grpc/grpc-js"
import { NextRequest, NextResponse } from "next/server"
import { getSuperbaCostSpClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"
import { isSyncNotConfigured } from "@/types/finance/superba-cost-sp"

export async function POST(request: NextRequest) {
    try {
        const metadata = createMetadataFromRequest(request)
        const response = await getSuperbaCostSpClient().syncSuperbaCostSps({}, metadata)

        return NextResponse.json({
            base: response.base,
            totalRows: response.totalRows,
            inserted: response.inserted,
            updated: response.updated,
            unchanged: response.unchanged,
            skipped: response.skipped,
            durationMs: response.durationMs,
            message: response.message,
        })
    } catch (error) {
        if (isGrpcError(error)) {
            const notConfiguredCode =
                error.code === grpc.status.FAILED_PRECONDITION || error.code === grpc.status.UNIMPLEMENTED
            const message = error.details || error.message || ""
            if (notConfiguredCode || isSyncNotConfigured(String(error.code), message)) {
                return NextResponse.json({
                    base: {
                        isSuccess: false,
                        statusCode: "409",
                        message: message || "Superba Cost SP sync is not configured yet",
                        validationErrors: [],
                    },
                })
            }
            return handleGrpcError(error)
        }
        console.error("Error syncing superba cost sps:", error)
        return NextResponse.json(
            { base: { isSuccess: false, statusCode: "500", message: "Failed to sync Superba Cost SPs", validationErrors: [] } },
            { status: 500 }
        )
    }
}
