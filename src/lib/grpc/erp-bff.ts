// Shared helpers for the ERP integration / ERP rule BFF routes (thin gRPC pass-through)

import { NextRequest, NextResponse } from "next/server"
import { isGrpcError, handleGrpcError } from "@/lib/grpc"

/** Runs a gRPC call and returns its response as JSON; gRPC errors map to HTTP via handleGrpcError. */
export async function erpHandle(label: string, fn: () => Promise<unknown>): Promise<NextResponse> {
    try {
        return NextResponse.json(await fn())
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error(`Error ${label}:`, error)
        return NextResponse.json(
            {
                base: { isSuccess: false, statusCode: "500", message: `Failed to ${label}`, validationErrors: [] },
            },
            { status: 500 }
        )
    }
}

/** Like erpHandle, but the call returns a binary file; a failed BaseResponse is passed through as JSON. */
export async function erpHandleFile(
    label: string,
    fn: () => Promise<{ base?: { isSuccess?: boolean } | undefined; fileContent: Uint8Array; fileName: string }>
): Promise<NextResponse> {
    try {
        const response = await fn()
        if (response.base && response.base.isSuccess === false) return NextResponse.json({ base: response.base })
        return new NextResponse(Buffer.from(response.fileContent), {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${response.fileName || "export.xlsx"}"`,
            },
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error(`Error ${label}:`, error)
        return NextResponse.json(
            {
                base: { isSuccess: false, statusCode: "500", message: `Failed to ${label}`, validationErrors: [] },
            },
            { status: 500 }
        )
    }
}

/** Parses the request JSON body; an empty/invalid body yields {}. */
export async function erpBody(request: NextRequest): Promise<Record<string, unknown>> {
    try {
        return (await request.json()) as Record<string, unknown>
    } catch {
        return {}
    }
}

/** Page/pageSize from the query string (defaults 1 / 10). */
export function erpPagination(request: NextRequest) {
    const sp = new URL(request.url).searchParams
    return { page: Number(sp.get("page")) || 1, pageSize: Number(sp.get("pageSize")) || 10 }
}

/** Enum from query/body: empty -> 0 (UNSPECIFIED), numeric passthrough, otherwise the generated fromJSON. */
export function erpEnum<T extends number>(fromJSON: (v: unknown) => T, v: unknown): T {
    if (v === undefined || v === null || v === "") return 0 as T
    if (typeof v === "number") return v as T
    if (/^\d+$/.test(String(v))) return Number(v) as T
    return fromJSON(v)
}

/** Query-string value ("" when absent). */
export function erpQ(request: NextRequest, key: string): string {
    return new URL(request.url).searchParams.get(key) || ""
}
