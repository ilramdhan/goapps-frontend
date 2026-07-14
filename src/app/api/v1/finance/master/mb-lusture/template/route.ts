// GET /api/v1/finance/master/mb-lusture/template - Download MB Lusture import template

import { NextRequest, NextResponse } from "next/server"
import { getMbLustureClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function GET(request: NextRequest) {
    try {
        const metadata = createMetadataFromRequest(request)
        const client = getMbLustureClient()
        const response = await client.downloadMbLustureTemplate({}, metadata)

        // Convert Uint8Array to base64 string for JSON serialization
        const fileContentBase64 = Buffer.from(response.fileContent).toString('base64')

        return NextResponse.json({
            base: response.base,
            fileContent: fileContentBase64,
            fileName: response.fileName,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error downloading MB Lusture template:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to download template",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
