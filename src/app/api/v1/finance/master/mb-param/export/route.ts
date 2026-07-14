// GET /api/v1/finance/master/mb-param/export - Export MB Params to Excel

import { NextRequest, NextResponse } from "next/server"
import { getMbParamClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const metadata = createMetadataFromRequest(request)
        const client = getMbParamClient()

        const response = await client.exportMbParams(
            {
                activeFilter: Number(searchParams.get("activeFilter") || searchParams.get("active_filter")) || 0,
            },
            metadata
        )

        const fileContentBase64 = Buffer.from(response.fileContent).toString('base64')

        return NextResponse.json({
            base: response.base,
            fileContent: fileContentBase64,
            fileName: response.fileName,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error exporting MB Params:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to export MB params",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
