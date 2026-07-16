// SSE bridge — proxies the IAM gRPC StreamNotifications AND StreamChatEvents
// server-streaming RPCs to the browser over a single Server-Sent Events
// connection.
//
// Reconnect resumes via the standard `Last-Event-ID` HTTP header, which the
// EventSource API sends automatically. We forward it as `since`/`lastEventId`
// to both upstream gRPC streams, which each replay their own missed events
// from the DB using their own event-id sequence.

import { NextRequest } from "next/server"
import { createMetadataFromRequest } from "@/lib/grpc"
import { getNotificationStreamingClient } from "@/lib/grpc/notification-stream-client"
import { getChatStreamingClient } from "@/lib/grpc/chat-stream-client"
import type { StreamNotificationsResponse } from "@/types/generated/iam/v1/notification"
import type { StreamChatEventsResponse } from "@/types/generated/iam/v1/chat"

interface FlatAttachment {
  attachmentId?: string
  fileName?: string
  fileUrl?: string
  contentType?: string
  fileSize?: number | string
  thumbnailUrl?: string
}

interface FlatChatEvent {
  type: string
  conversationId?: string
  messageId?: string
  senderUserId?: string
  senderName?: string
  body?: string
  isEdited?: boolean
  isDeleted?: boolean
  attachments?: FlatAttachment[]
  createdAt?: string
  updatedAt?: string
  userId?: string
  userName?: string
  isTyping?: boolean
  readAt?: string
  isOnline?: boolean
}

function flattenChatEvent(event: StreamChatEventsResponse): FlatChatEvent {
  if (event.messageReceived) {
    const m = event.messageReceived.message
    return {
      type: "message_received",
      conversationId: event.messageReceived.conversationId,
      messageId: m?.messageId, senderUserId: m?.senderUserId,
      senderName: m?.senderName, body: m?.body,
      isEdited: m?.isEdited, isDeleted: m?.isDeleted,
      attachments: m?.attachments,
      createdAt: m?.createdAt, updatedAt: m?.updatedAt,
    }
  }
  if (event.messageEdited) {
    const m = event.messageEdited.message
    return {
      type: "message_edited",
      conversationId: event.messageEdited.conversationId,
      messageId: m?.messageId, senderUserId: m?.senderUserId,
      body: m?.body, isEdited: m?.isEdited, isDeleted: m?.isDeleted,
      attachments: m?.attachments,
      createdAt: m?.createdAt, updatedAt: m?.updatedAt,
    }
  }
  if (event.messageDeleted) {
    return {
      type: "message_deleted",
      conversationId: event.messageDeleted.conversationId,
      messageId: event.messageDeleted.messageId,
    }
  }
  if (event.typing) {
    return {
      type: "typing",
      conversationId: event.typing.conversationId,
      userId: event.typing.userId, userName: event.typing.userName,
      isTyping: event.typing.isTyping,
    }
  }
  if (event.readReceipt) {
    return {
      type: "read_receipt",
      conversationId: event.readReceipt.conversationId,
      userId: event.readReceipt.userId, readAt: event.readReceipt.readAt,
    }
  }
  if (event.presence) {
    return {
      type: "presence",
      userId: event.presence.userId, isOnline: event.presence.isOnline,
    }
  }
  return { type: "unknown" }
}

export const runtime = "nodejs"
// Streaming responses must NOT be cached; also disable Next's static optimization.
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const since = request.headers.get("Last-Event-ID") ?? ""
  const metadata = createMetadataFromRequest(request)
  const notificationClient = getNotificationStreamingClient()
  const chatClient = getChatStreamingClient()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      const notificationCall = notificationClient.streamNotifications({ since }, metadata)
      const chatCall = chatClient.streamChatEvents({ lastEventId: since }, metadata)

      let notificationDone = false
      let chatDone = false
      let closed = false

      const closeController = () => {
        if (closed) return
        closed = true
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      const maybeCloseController = () => {
        if (notificationDone && chatDone) closeController()
      }

      const closeAll = () => {
        try {
          notificationCall.cancel()
        } catch {
          // already cancelled
        }
        try {
          chatCall.cancel()
        } catch {
          // already cancelled
        }
        closeController()
      }

      notificationCall.on("data", (event: StreamNotificationsResponse) => {
        // Encode as SSE frame.
        // Heartbeat events have notification=null — we still send them so the
        // browser keeps the connection warm and tracks Last-Event-ID.
        const eventId = event.eventId ?? ""
        const payload = JSON.stringify(event)
        const frame = `id: ${eventId}\nevent: notification\ndata: ${payload}\n\n`
        try {
          controller.enqueue(encoder.encode(frame))
        } catch {
          // controller closed by client disconnect
          closeAll()
        }
      })

      notificationCall.on("end", () => {
        notificationDone = true
        maybeCloseController()
      })

      notificationCall.on("error", (err) => {
        // Forward as SSE error frame, then close. EventSource will reconnect.
        const frame = `event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`
        try {
          controller.enqueue(encoder.encode(frame))
        } catch {
          // ignore
        }
        notificationDone = true
        closeAll()
      })

      chatCall.on("data", (event: StreamChatEventsResponse) => {
        const eventId = event.eventId ?? ""
        const flat = flattenChatEvent(event)
        const frame = `id: ${eventId}\nevent: chat\ndata: ${JSON.stringify(flat)}\n\n`
        try {
          controller.enqueue(encoder.encode(frame))
        } catch {
          // controller closed by client disconnect
          closeAll()
        }
      })

      chatCall.on("end", () => {
        chatDone = true
        maybeCloseController()
      })

      chatCall.on("error", (err) => {
        // Forward as SSE error frame, then close. EventSource will reconnect.
        const frame = `event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`
        try {
          controller.enqueue(encoder.encode(frame))
        } catch {
          // ignore
        }
        chatDone = true
        closeAll()
      })

      // Tear down both upstream gRPC calls when the browser disconnects.
      request.signal.addEventListener("abort", closeAll)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable NGINX buffering for streaming.
    },
  })
}
