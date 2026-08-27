// Finance MB Dozing calculator route — POST only, READ-ONLY (K-18): the RPC
// computes a target LDR and persists nothing.
//
// Modes are SCALE and XSECTION only. STRENGTH is on hold (G6-C3) and is not
// part of the generated request type — do not add it here.
//
// `resultLdr` is deliberately forwarded as-is: the backend LEAVES IT UNSET when
// `factorAvailable` is false. Never default it to 0 or 1.0 on the way through.

import { NextRequest, NextResponse } from "next/server"
import {
    getMBDozingClient,
    createMetadataFromRequest,
    isGrpcError,
    handleGrpcError,
} from "@/lib/grpc"

// POST /api/v1/finance/mb-dozing/calculate - Calculate target LDR
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const metadata = createMetadataFromRequest(request)
        const client = getMBDozingClient()

        const response = await client.calculateDozing(
            {
                mode: body.mode ?? "",
                ldrRef: body.ldrRef ?? body.ldr_ref,
                denierRef: body.denierRef ?? body.denier_ref,
                filamentRef: body.filamentRef ?? body.filament_ref,
                denierTarget: body.denierTarget ?? body.denier_target,
                filamentTarget: body.filamentTarget ?? body.filament_target,
                ldrSource: body.ldrSource ?? body.ldr_source,
                fromCrossSection: body.fromCrossSection ?? body.from_cross_section,
                toCrossSection: body.toCrossSection ?? body.to_cross_section,
            },
            metadata
        )

        return NextResponse.json({
            base: response.base,
            // Absent stays absent — no fallback value is invented here.
            resultLdr: response.resultLdr,
            formulaCode: response.formulaCode,
            calculationTrace: response.calculationTrace,
            factorAvailable: response.factorAvailable,
        })
    } catch (error) {
        if (isGrpcError(error)) return handleGrpcError(error)
        console.error("Error calculating MB dozing:", error)
        return NextResponse.json(
            {
                base: {
                    isSuccess: false,
                    statusCode: "500",
                    message: "Failed to calculate dozing",
                    validationErrors: [],
                },
                factorAvailable: false,
            },
            { status: 500 }
        )
    }
}
