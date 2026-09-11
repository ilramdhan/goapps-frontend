// GET /api/v1/finance/mb-heads/export-cost-calc-detail
//
// Flat 29-column snake_case dump of the PERSISTED cost snapshot — one row per
// (MB, raw-material line). Machine-readable calc audit format, not a human report.
//
// ⛔ Deliberately a SEPARATE route from /mb-heads/export-full (the 37-column recipe
// report, which must stay byte-for-byte unchanged) and from /mb-heads/export (the
// round-trip import format, decision D7). Do not merge or "share" any of the three.

import { NextRequest, NextResponse } from "next/server"
import { getMBHeadClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const metadata = createMetadataFromRequest(request)
        const client = getMBHeadClient()

        // Omitted filters are forwarded as the empty string, never defaulted here — the
        // default lives in exactly one place, the backend handler (D13). Empty `period`
        // means "latest calculated period per head", empty `calculationType` means the
        // backend default (ACTUAL), and empty `calcStatus` means ALL snapshot statuses.
        //
        // includeRejected defaults to false unless the caller explicitly asks for
        // "true"/"1". ⛔ Never use Boolean(param): the string "false" is truthy and
        // would flip the default the wrong way.
        const includeRejectedParam =
            searchParams.get("includeRejected") ?? searchParams.get("include_rejected")
        const includeRejected = includeRejectedParam === "true" || includeRejectedParam === "1"

        const response = await client.exportMBCostCalcDetail(
            {
                activeFilter: Number(searchParams.get("activeFilter") || searchParams.get("active_filter")) || 0,
                period: searchParams.get("period") ?? "",
                calculationType:
                    searchParams.get("calculationType") ?? searchParams.get("calculation_type") ?? "",
                calcStatus: searchParams.get("calcStatus") ?? searchParams.get("calc_status") ?? "",
                includeRejected,
            },
            metadata
        )

        // Convert Uint8Array to base64 so the proto parser (bytesFromBase64) can read it back.
        const fileContentBase64 = Buffer.from(response.fileContent).toString("base64")

        return NextResponse.json({
            base: response.base,
            fileContent: fileContentBase64,
            fileName: response.fileName,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error exporting MB cost calc detail:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to export MB cost calc detail",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
