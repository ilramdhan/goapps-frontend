// GET /api/v1/finance/mb-heads/export - Export MB Heads to Excel

import { NextRequest, NextResponse } from "next/server"
import { getMBHeadClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const metadata = createMetadataFromRequest(request)
        const client = getMBHeadClient()

        // includeRejected defaults to false (exclude REJECTED MB Heads) unless the
        // caller explicitly asks for "true"/"1" — an absent or any other value must
        // NOT include rejected documents. Do not use Boolean(param): the string
        // "false" is truthy and would flip the default the wrong way.
        const includeRejectedParam =
            searchParams.get("includeRejected") ?? searchParams.get("include_rejected")
        const includeRejected = includeRejectedParam === "true" || includeRejectedParam === "1"

        const response = await client.exportMBHeads(
            {
                activeFilter: Number(searchParams.get("activeFilter") || searchParams.get("active_filter")) || 0,
                includeRejected,
            },
            metadata
        )

        // Convert Uint8Array to base64 string for JSON serialization
        // Proto parser (bytesFromBase64) expects base64 string, not Uint8Array object
        const fileContentBase64 = Buffer.from(response.fileContent).toString('base64')

        return NextResponse.json({
            base: response.base,
            fileContent: fileContentBase64,
            fileName: response.fileName,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error exporting MB Heads:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to export MB heads",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
