// IAM Chat route — upload a file/image attachment to a conversation.
// Accepts multipart/form-data with a single "file", forwards it to the gRPC
// UploadChatAttachment RPC as bytes, and returns the attachment metadata.

import { NextRequest, NextResponse } from "next/server"
import { getChatClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

type RouteContext = { params: Promise<{ id: string }> }

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB (matches proto validation)
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "application/zip",
]

function errorResponse(status: number, message: string, field?: string) {
  return NextResponse.json(
    {
      base: {
        isSuccess: false,
        statusCode: String(status),
        message,
        validationErrors: field ? [{ field, message }] : [],
      },
      data: null,
    },
    { status }
  )
}

// POST /api/v1/iam/chat/conversations/[id]/attachments — upload one file.
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return errorResponse(400, "No file provided", "file")
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse(400, `Unsupported file type: ${file.type || "unknown"}`, "file")
    }
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(
        400,
        `File too large. Maximum size is 25MB (got ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
        "file"
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const fileData = new Uint8Array(arrayBuffer)

    const metadata = createMetadataFromRequest(request)
    const client = getChatClient()
    const response = await client.uploadChatAttachment(
      {
        conversationId: id,
        fileName: file.name,
        contentType: file.type,
        fileData,
      },
      metadata
    )

    return NextResponse.json({
      base: response.base,
      data: response.data,
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    console.error("Error uploading chat attachment:", error)
    return errorResponse(500, "Failed to upload attachment")
  }
}
