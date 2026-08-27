/**
 * P10 unlock hooks — useRequestUnlockMBHead / useGrantUnlockMBHead / useRejectUnlockMBHead.
 *
 * Three things are worth pinning at the hook boundary:
 *
 * 1. Each hook must hit its OWN BFF route. `/reject` (workflow reject of a SUBMITTED
 *    head) and `/reject-unlock` (refusing a pending unlock request) are DIFFERENT
 *    transitions with different source states — a hook silently pointing at the wrong
 *    one would reject the recipe instead of the request, with no test failing.
 * 2. Grant carries NO reason. GrantUnlockMBHeadRequest has no reason field at all
 *    (yarn_master.ts:1997-2001) — granting is an assent, not a refusal. A body that
 *    smuggled one in would be inventing a field the proto does not have.
 * 3. Both reason-carrying hooks forward the reason verbatim so the backend's
 *    ErrReasonRequired stays the single source of truth on emptiness.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

const fetchMock = vi.fn()

const toastError = vi.fn()
const toastSuccess = vi.fn()
vi.mock("sonner", () => ({
  toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) },
}))

import {
  useRequestUnlockMBHead,
  useGrantUnlockMBHead,
  useRejectUnlockMBHead,
} from "@/hooks/finance/use-mb-head"

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const MBH_ID = "11111111-1111-1111-1111-111111111111"

/** A BFF envelope shaped the way the transition proxies actually return one. */
function okEnvelope(entryStatus: string) {
  return {
    json: async () => ({
      base: { isSuccess: true, statusCode: "200", message: "OK", validationErrors: [] },
      data: { mbhId: MBH_ID, entryStatus },
    }),
  }
}

function failEnvelope(message: string) {
  return {
    json: async () => ({
      base: { isSuccess: false, statusCode: "409", message, validationErrors: [] },
    }),
  }
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
  return { url, init, body: JSON.parse(String(init.body)) as Record<string, unknown> }
}

beforeEach(() => {
  vi.clearAllMocks()
  // ⚠ Stubbed HERE, not at module scope: the shared setup file starts MSW in a
  // `beforeAll`, and `server.listen()` replaces globalThis.fetch — a module-scope
  // stub would be silently overwritten before the first test ran.
  vi.stubGlobal("fetch", fetchMock)
})

describe("useRequestUnlockMBHead", () => {
  it("posts to the dedicated request-unlock route with the reason", async () => {
    fetchMock.mockResolvedValue(okEnvelope("UNLOCK_REQUESTED"))

    const { result } = renderHook(() => useRequestUnlockMBHead(), { wrapper })
    result.current.mutate({ mbhId: MBH_ID, reason: "wrong dozing" })

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const { url, init, body } = lastCall()
    expect(url).toBe(`/api/v1/finance/mb-heads/${MBH_ID}/request-unlock`)
    expect(init.method).toBe("POST")
    expect(body).toEqual({ reason: "wrong dozing" })
  })

  it("toasts success once the transition lands", async () => {
    fetchMock.mockResolvedValue(okEnvelope("UNLOCK_REQUESTED"))

    const { result } = renderHook(() => useRequestUnlockMBHead(), { wrapper })
    result.current.mutate({ mbhId: MBH_ID, reason: "wrong dozing" })

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
    expect(toastError).not.toHaveBeenCalled()
  })

  it("surfaces a domain failure envelope as an error toast", async () => {
    // HTTP 200 with isSuccess=false — e.g. ErrReasonRequired or ErrInvalidTransition.
    fetchMock.mockResolvedValue(failEnvelope("reason is required"))

    const { result } = renderHook(() => useRequestUnlockMBHead(), { wrapper })
    result.current.mutate({ mbhId: MBH_ID, reason: "" })

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(toastError.mock.calls[0][0]).toContain("reason is required")
    expect(toastSuccess).not.toHaveBeenCalled()
  })
})

describe("useGrantUnlockMBHead", () => {
  it("posts to the grant-unlock route taking only an id", async () => {
    fetchMock.mockResolvedValue(okEnvelope("DRAFT"))

    const { result } = renderHook(() => useGrantUnlockMBHead(), { wrapper })
    // ⛔ The no-reason helper: the mutate argument is the bare id, not an object.
    result.current.mutate(MBH_ID)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const { url, body } = lastCall()
    expect(url).toBe(`/api/v1/finance/mb-heads/${MBH_ID}/grant-unlock`)
    // ⛔ No reason may appear — GrantUnlockMBHeadRequest has no such field.
    expect(body).toEqual({})
    expect(body).not.toHaveProperty("reason")
  })

  it("does not target the request-unlock or reject-unlock route", async () => {
    fetchMock.mockResolvedValue(okEnvelope("DRAFT"))

    const { result } = renderHook(() => useGrantUnlockMBHead(), { wrapper })
    result.current.mutate(MBH_ID)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const { url } = lastCall()
    expect(url).not.toContain("/request-unlock")
    expect(url).not.toContain("/reject-unlock")
  })

  it("surfaces ErrUnlockNotRequested as an error toast", async () => {
    fetchMock.mockResolvedValue(failEnvelope("unlock not requested"))

    const { result } = renderHook(() => useGrantUnlockMBHead(), { wrapper })
    result.current.mutate(MBH_ID)

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(toastError.mock.calls[0][0]).toContain("unlock not requested")
  })
})

describe("useRejectUnlockMBHead", () => {
  it("posts to reject-unlock — NOT the workflow reject route", async () => {
    fetchMock.mockResolvedValue(okEnvelope("VALIDATED"))

    const { result } = renderHook(() => useRejectUnlockMBHead(), { wrapper })
    result.current.mutate({ mbhId: MBH_ID, reason: "not justified" })

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const { url, body } = lastCall()
    expect(url).toBe(`/api/v1/finance/mb-heads/${MBH_ID}/reject-unlock`)
    // The plain reject route is a strict prefix — assert we did not land there.
    expect(url.endsWith("/reject")).toBe(false)
    expect(body).toEqual({ reason: "not justified" })
  })

  it("toasts success once the refusal lands", async () => {
    fetchMock.mockResolvedValue(okEnvelope("VALIDATED"))

    const { result } = renderHook(() => useRejectUnlockMBHead(), { wrapper })
    result.current.mutate({ mbhId: MBH_ID, reason: "not justified" })

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
    expect(toastError).not.toHaveBeenCalled()
  })

  it("surfaces ErrUnlockOriginUnknown (422, K-52) as an error toast", async () => {
    fetchMock.mockResolvedValue(failEnvelope("unlock origin unknown"))

    const { result } = renderHook(() => useRejectUnlockMBHead(), { wrapper })
    result.current.mutate({ mbhId: MBH_ID, reason: "not justified" })

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(toastError.mock.calls[0][0]).toContain("unlock origin unknown")
  })
})
