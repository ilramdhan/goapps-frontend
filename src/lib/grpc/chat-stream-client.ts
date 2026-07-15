// Server-streaming gRPC client specifically for ChatService.StreamChatEvents.
// Mirrors notification-stream-client.ts: the generic service-client wraps
// everything as unary Promise, so streaming RPCs get a dedicated helper.

import * as grpc from "@grpc/grpc-js"
import {
  ChatServiceDefinition,
  StreamChatEventsRequest,
  StreamChatEventsResponse,
} from "@/types/generated/iam/v1/chat"

const SERVICE_ADDRESS = `${process.env.IAM_GRPC_HOST || "localhost"}:${process.env.IAM_GRPC_PORT || "50052"}`

const CHANNEL_OPTIONS = {
  "grpc.keepalive_time_ms": 60000,
  "grpc.keepalive_timeout_ms": 20000,
  "grpc.keepalive_permit_without_calls": 1,
}

interface RawStreamingClient {
  streamChatEvents: (
    request: StreamChatEventsRequest,
    metadata: grpc.Metadata,
    options?: grpc.CallOptions,
  ) => grpc.ClientReadableStream<StreamChatEventsResponse>
  close: () => void
}

let cachedClient: RawStreamingClient | null = null

function buildClient(): RawStreamingClient {
  const method = ChatServiceDefinition.methods.streamChatEvents
  const grpcServiceDef: Record<string, grpc.MethodDefinition<unknown, unknown>> = {
    streamChatEvents: {
      path: `/${ChatServiceDefinition.fullName}/${method.name}`,
      requestStream: method.requestStream,
      responseStream: method.responseStream,
      requestSerialize: (value: unknown) =>
        Buffer.from(method.requestType.encode(value as StreamChatEventsRequest).finish()),
      requestDeserialize: (buffer: Buffer) =>
        method.requestType.decode(new Uint8Array(buffer)),
      responseSerialize: (value: unknown) =>
        Buffer.from(method.responseType.encode(value as StreamChatEventsResponse).finish()),
      responseDeserialize: (buffer: Buffer) =>
        method.responseType.decode(new Uint8Array(buffer)),
    },
  }
  const ClientCtor = grpc.makeClientConstructor(grpcServiceDef, ChatServiceDefinition.name)
  const c = new ClientCtor(SERVICE_ADDRESS, grpc.credentials.createInsecure(), CHANNEL_OPTIONS) as unknown as RawStreamingClient
  return c
}

// getChatStreamingClient returns a singleton client capable of opening
// server-streaming subscriptions to ChatService.StreamChatEvents.
// The client is reused across requests; gRPC handles connection lifecycle.
export function getChatStreamingClient(): RawStreamingClient {
  if (!cachedClient) {
    cachedClient = buildClient()
  }
  return cachedClient
}
