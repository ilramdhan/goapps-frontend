// GET /api/v1/finance/mb-heads/export-full
//
// P12 (items C1 + C2): denormalized full-recipe export — one Excel row per composition
// line, with the MB cost block joined in.
//
// This is a READ-ONLY report. It is deliberately a SEPARATE route from
// /mb-heads/export, which doubles as the round-trip import format (decision D7) and
// must stay byte-identical.

import { NextRequest, NextResponse } from "next/server"
import { getMBHeadClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const metadata = createMetadataFromRequest(request)
        const client = getMBHeadClient()

        // An omitted period/costType is forwarded as the empty string, which the backend
        // reads as "latest period per head" / "default to ACTUAL". It is NOT filled in
        // here — the default belongs in exactly one place (D13).
        //
        // checkStatusCalc empty means ALL ROWS, the NULL ("Belum dihitung") heads
        // INCLUDED — so an absent param leaves this export behaving exactly as it did
        // before the filter existed. ⛔ Never defaulted here either.
        // includeRejected defaults to false (exclude REJECTED MB Heads) unless the
        // caller explicitly asks for "true"/"1" — an absent or any other value must
        // NOT include rejected documents. Do not use Boolean(param): the string
        // "false" is truthy and would flip the default the wrong way.
        const includeRejectedParam =
            searchParams.get("includeRejected") ?? searchParams.get("include_rejected")
        const includeRejected = includeRejectedParam === "true" || includeRejectedParam === "1"

        const response = await client.exportMBRecipeFull(
            {
                activeFilter: Number(searchParams.get("activeFilter") || searchParams.get("active_filter")) || 0,
                period: searchParams.get("period") ?? "",
                costType: searchParams.get("costType") ?? searchParams.get("cost_type") ?? "",
                checkStatusCalc:
                    searchParams.get("checkStatusCalc") ?? searchParams.get("check_status_calc") ?? "",
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
        console.error("Error exporting MB recipe full:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to export MB recipe full",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
