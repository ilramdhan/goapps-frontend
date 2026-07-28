// Shared PPC BFF helpers. The `_lib` directory is ignored by Next.js routing
// (underscore prefix), so these are plain modules, not route handlers.

import { NextRequest, NextResponse } from "next/server"
import { getPpcClient, createMetadataFromRequest, isGrpcError, handleGrpcError } from "@/lib/grpc"

export type PpcClient = ReturnType<typeof getPpcClient>
type Meta = ReturnType<typeof createMetadataFromRequest>

/**
 * ppcProxy wraps a single PPC gRPC call in the standard BFF envelope + error
 * handling. The resolver receives the singleton client + request metadata and
 * returns the gRPC response object (already shaped as { base, data, ... }).
 */
export async function ppcProxy(
  request: NextRequest,
  errorMessage: string,
  fn: (client: PpcClient, metadata: Meta) => Promise<unknown>
): Promise<NextResponse> {
  try {
    const client = getPpcClient()
    const metadata = createMetadataFromRequest(request)
    const response = await fn(client, metadata)
    return NextResponse.json(response as Record<string, unknown>)
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    console.error(errorMessage, error)
    return NextResponse.json(
      { base: { isSuccess: false, statusCode: "500", message: errorMessage, validationErrors: [] } },
      { status: 500 }
    )
  }
}

/** Read a string search param (camelCase or snake_case fallback). */
export function qStr(sp: URLSearchParams, camel: string, snake?: string): string {
  return sp.get(camel) || (snake ? sp.get(snake) : null) || ""
}

/** Read an integer search param with a default. */
export function qInt(sp: URLSearchParams, camel: string, def = 0, snake?: string): number {
  const raw = sp.get(camel) || (snake ? sp.get(snake) : null)
  const n = Number(raw)
  return raw !== null && !Number.isNaN(n) ? n : def
}

/** Read an optional integer search param (undefined when absent). */
export function qIntOpt(sp: URLSearchParams, camel: string, snake?: string): number | undefined {
  const raw = sp.get(camel) || (snake ? sp.get(snake) : null)
  if (raw === null) return undefined
  const n = Number(raw)
  return Number.isNaN(n) ? undefined : n
}

/**
 * Read an optional boolean search param (camelCase or snake_case fallback).
 *
 * `buildQueryString` snake_cases every key on the way out, so a camelCase-only
 * lookup here silently reads `null` and drops the filter — that is what let
 * already-pulled staging rows back into the Pull-from-Orion LOV (gap G5).
 */
export function qBoolOpt(sp: URLSearchParams, camel: string, snake?: string): boolean | undefined {
  const fallback = snake ?? camel.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
  const raw = sp.get(camel) ?? sp.get(fallback)
  if (raw === null) return undefined
  return raw === "true" || raw === "1"
}

export const page = (sp: URLSearchParams) => qInt(sp, "page", 1)
export const pageSize = (sp: URLSearchParams) => qInt(sp, "pageSize", 10, "page_size")
