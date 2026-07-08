// GET /api/v1/finance/cost-product-requests/export - Export cost product requests to Excel

import { NextRequest, NextResponse } from "next/server"
import { getCostProductRequestClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const metadata = createMetadataFromRequest(request)
        const client = getCostProductRequestClient()

        const response = await client.exportCostProductRequests(
            {
                search: searchParams.get("search") || "",
                status: searchParams.get("status") || "",
                requestTypeId: Number(searchParams.get("requestTypeId") || searchParams.get("request_type_id")) || 0,
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
        console.error("Error exporting cost product requests:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to export product requests",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
    }
}
