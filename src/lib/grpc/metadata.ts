// gRPC Metadata helpers for request context

import * as grpc from "@grpc/grpc-js"
import type { NextRequest } from "next/server"

export function createAuthMetadata(accessToken: string): grpc.Metadata {
  const metadata = new grpc.Metadata()
  metadata.set("authorization", `Bearer ${accessToken}`)
  return metadata
}

export function createMetadataFromRequest(request: NextRequest, accessToken?: string): grpc.Metadata {
  const metadata = new grpc.Metadata()

  // Set auth token
  if (accessToken) {
    metadata.set("authorization", `Bearer ${accessToken}`)
  } else {
    const token = request.cookies.get("goapps_access_token")?.value
    if (token) {
      metadata.set("authorization", `Bearer ${token}`)
    }
  }

  // Forward tracing headers
  const requestId = request.headers.get("x-request-id")
  if (requestId) {
    metadata.set("x-request-id", requestId)
  }

  const userAgent = request.headers.get("user-agent")
  if (userAgent) {
    metadata.set("user-agent", userAgent)
  }

  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    metadata.set("x-forwarded-for", forwardedFor)
  }

  return metadata
}

// createInternalMetadataFromRequest builds metadata for BFF calls to a backend's
// internal service-to-service RPCs (e.g. finance CostMasterLookupService, which
// is authenticated by a shared secret rather than a user JWT). It forwards the
// usual tracing headers and the user's bearer token (harmless, ignored by the
// internal auth path) AND attaches the internal service secret in the
// x-service-secret header that finance's auth interceptor accepts. The secret is
// read from FINANCE_INTERNAL_TOKEN (server-side only — never exposed to the
// browser); when unset the header is omitted so a finance instance with an empty
// service_secret (dev default without override) still works.
export function createInternalMetadataFromRequest(request: NextRequest): grpc.Metadata {
  const metadata = createMetadataFromRequest(request)
  const secret = process.env.FINANCE_INTERNAL_TOKEN
  if (secret) {
    metadata.set("x-service-secret", secret)
  }
  return metadata
}
