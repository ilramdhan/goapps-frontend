// GET /api/v1/finance/master/mb-param/template - Download MB Param import template

import { NextRequest, NextResponse } from "next/server"
import { getMbParamClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function GET(request: NextRequest) {
    try {
        const metadata = createMetadataFromRequest(request)
        const client = getMbParamClient()
        const response = await client.downloadMbParamTemplate({}, metadata)

        // Convert Uint8Array to base64 string for JSON serialization
        const fileContentBase64 = Buffer.from(response.fileContent).toString('base64')

        return NextResponse.json({
            base: response.base,
            fileContent: fileContentBase64,
            fileName: response.fileName,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error downloading MB Param template:", error)
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
