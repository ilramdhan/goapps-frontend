// POST /api/v1/iam/auth/refresh - Token refresh endpoint
// Refreshes tokens using refresh token from httpOnly cookie

import { NextRequest, NextResponse } from "next/server"
import { setAuthCookiesOnResponse, clearAuthCookiesOnResponse } from "@/lib/auth/cookies"
import { getAuthClient, isGrpcError, handleGrpcError } from "@/lib/grpc"

export async function POST(request: NextRequest) {
    try {
        const refreshToken = request.cookies.get("goapps_refresh_token")?.value

        if (!refreshToken) {
            return NextResponse.json(
                {
                    base: {
                        isSuccess: false,
                        statusCode: "401",
                        message: "No refresh token available",
                        validationErrors: [],
                    },
                },
                { status: 401 }
            )
        }

        const client = getAuthClient()
        const response = await client.refreshToken({ refreshToken })

        // IAM's RefreshToken RPC never returns a transport-level gRPC error for a
        // rejected/expired/revoked refresh token (auth_handler.go folds the domain
        // error into `base` and always returns a nil gRPC error) — so a business
        // failure lands here in the try block, not in the catch below. Without this
        // check the route fell through to a 200 OK with no tokens set, which made
        // AuthProvider's `!response.ok` check in refreshSession() read a genuinely
        // failed refresh as a success: the silent-refresh interval kept running,
        // never re-logged the user in, and the still-httpOnly access-token cookie
        // was left to expire on its own ~15 min later with nothing alerting the
        // app — the next request from any tab then hits the backend with no
        // Authorization header at all. Surface the failure as a real 401 instead.
        if (!response.base?.isSuccess || !response.data?.accessToken || !response.data?.refreshToken) {
            const errResponse = NextResponse.json({ base: response.base }, { status: 401 })
            clearAuthCookiesOnResponse(errResponse)
            return errResponse
        }

        const jsonResponse = NextResponse.json({
            base: response.base,
            data: {
                expiresIn: response.data.expiresIn,
            },
        })

        // Set new tokens directly on the response (next/headers cookies().set() broken in Next.js 16.2+)
        setAuthCookiesOnResponse(jsonResponse, {
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
            expiresIn: response.data.expiresIn,
        })

        return jsonResponse
    } catch (error) {
        console.error("Token refresh error:", error)
        if (isGrpcError(error)) {
            const errResponse = handleGrpcError(error)
            clearAuthCookiesOnResponse(errResponse as NextResponse)
            return errResponse
        }
        const errResponse = NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to refresh token",
                    validationErrors: [],
                },
            },
            { status: 500 }
        )
        clearAuthCookiesOnResponse(errResponse)
        return errResponse
    }
}
