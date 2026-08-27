// Regression test for the R19-A diagnosability fix on the MB Head "request unlock" BFF
// route: src/app/api/v1/finance/mb-heads/[mbhId]/request-unlock/safe-error-message.ts
//
// This is the FIRST test file under an `api/` route in this repo (no existing BFF route
// test convention). It deliberately unit-tests the extracted helper directly, rather than
// invoking the Next.js `POST` handler (which would additionally require mocking
// `next/server`'s `NextRequest`/`NextResponse` and the `@/lib/grpc` client registry — a
// separate concern from what this fix touches). If a broader BFF-route testing pattern is
// introduced later, this file's `describe` block can be extended to exercise `POST`
// end-to-end instead.
import { describe, expect, it } from "vitest"
import { safeUnlockErrorMessage } from "@/app/api/v1/finance/mb-heads/[mbhId]/request-unlock/safe-error-message"

describe("safeUnlockErrorMessage", () => {
    const fallback = "Failed to request MB head unlock"

    it("returns the fallback when the error is not an Error instance", () => {
        expect(safeUnlockErrorMessage("boom", fallback)).toBe(fallback)
        expect(safeUnlockErrorMessage(undefined, fallback)).toBe(fallback)
        expect(safeUnlockErrorMessage({ message: "x" }, fallback)).toBe(fallback)
    })

    it("returns the fallback when the Error has no message", () => {
        expect(safeUnlockErrorMessage(new Error(""), fallback)).toBe(fallback)
    })

    it("appends a safe, ordinary error message to the fallback", () => {
        const err = new Error("client not initialized")
        expect(safeUnlockErrorMessage(err, fallback)).toBe(
            "Failed to request MB head unlock: client not initialized"
        )
    })

    it("falls back when the message contains a connection string", () => {
        const err = new Error("connect failed: postgres://finance:finance123@db-host:5432/finance_db")
        expect(safeUnlockErrorMessage(err, fallback)).toBe(fallback)
    })

    it("falls back when the message contains an amqp credential URL", () => {
        const err = new Error("dial amqp://guest:guest@rabbitmq:5672/ failed")
        expect(safeUnlockErrorMessage(err, fallback)).toBe(fallback)
    })

    it("falls back when the message mentions a password/secret/token/credential", () => {
        expect(safeUnlockErrorMessage(new Error("auth failed: password=hunter2"), fallback)).toBe(fallback)
        expect(safeUnlockErrorMessage(new Error("missing api_key: abc123"), fallback)).toBe(fallback)
        expect(safeUnlockErrorMessage(new Error("secret: xyz"), fallback)).toBe(fallback)
    })

    it("falls back when the message contains a newline (possible stack trace leak)", () => {
        const err = new Error("boom\n    at somewhere (file.ts:1:1)")
        expect(safeUnlockErrorMessage(err, fallback)).toBe(fallback)
    })

    it("falls back when the message contains an inline stack-frame shape", () => {
        const err = new Error("failed at doThing (file.ts:1:1)")
        expect(safeUnlockErrorMessage(err, fallback)).toBe(fallback)
    })

    it("truncates very long messages", () => {
        const long = "x".repeat(300)
        const result = safeUnlockErrorMessage(new Error(long), fallback)
        expect(result.length).toBeLessThan(300)
        expect(result.endsWith("…")).toBe(true)
        expect(result.startsWith(fallback)).toBe(true)
    })
})
