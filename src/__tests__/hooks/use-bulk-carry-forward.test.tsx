/**
 * Tests for useBulkCarryForwardAsIs / useProcessCarryForward (PLAN-04 / S-2.1).
 *
 * The regression these exist for: the PPC BFF proxies the gRPC response
 * verbatim with HTTP 200, and the backend maps every domain error to
 * `base.isSuccess = false` rather than an HTTP status. `apiClient` only throws
 * on a non-OK status, so a domain-rejected carry — ErrSplitExceedsRemaining, a
 * refused state transition — arrived here looking exactly like a success.
 *
 * In bulk that meant the row was counted `ok: true`, written into the session
 * recap as carried, and removed from the candidate list, having done nothing.
 * That is the direct negation of "never claim success for a partially-failed
 * batch", so it is asserted at the hook boundary rather than through the
 * component (whose tests mock this module wholesale and cannot see it).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

const post = vi.fn()

// Only apiClient.post is replaced — the module also exports buildQueryString
// and friends that the CRUD factory in this hook file needs at import time.
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      post: (...args: unknown[]) => post(...args),
    },
  }
})

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useBulkCarryForwardAsIs, useProcessCarryForward } from "@/hooks/ppc/use-demand"
import { CarryAction } from "@/types/ppc/common"

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

/** A BFF envelope the way the PPC proxy actually returns one. */
const ok = () => ({ base: { isSuccess: true, statusCode: "200", message: "OK" }, data: [] })
const domainFailure = (message: string) => ({
  // HTTP 200 — apiClient resolves. The failure is inside the envelope.
  base: { isSuccess: false, statusCode: "400", message },
  data: [],
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("useBulkCarryForwardAsIs", () => {
  it("reports a domain-rejected row as failed, not carried", async () => {
    post
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(domainFailure("split exceeds remaining quantity"))
      .mockResolvedValueOnce(ok())

    const { result } = renderHook(() => useBulkCarryForwardAsIs(), { wrapper })
    const res = await result.current.mutateAsync({
      demands: [
        { demandId: 1, label: "PRD-001" },
        { demandId: 2, label: "PRD-002" },
        { demandId: 3, label: "PRD-003" },
      ],
      targetMonth: "2026-08",
    })

    expect(res.succeeded).toBe(2)
    expect(res.failed).toBe(1)

    const failed = res.outcomes.filter((o) => !o.ok)
    expect(failed).toHaveLength(1)
    // Named by label, never by id, and carrying the backend's own message.
    expect(failed[0].label).toBe("PRD-002")
    expect(failed[0].error).toBe("split exceeds remaining quantity")

    // The rejected row must NOT be reported as carried — the component writes
    // ok outcomes into the session recap and drops them from the candidate
    // list, so a false ok makes a row vanish having done nothing.
    expect(res.outcomes.find((o) => o.demandId === 2)?.ok).toBe(false)
    expect(res.outcomes.filter((o) => o.ok).map((o) => o.demandId)).toEqual([1, 3])
  })

  it("keeps going after a rejection rather than abandoning the rest", async () => {
    post
      .mockResolvedValueOnce(domainFailure("demand is not a carry candidate"))
      .mockResolvedValueOnce(ok())

    const { result } = renderHook(() => useBulkCarryForwardAsIs(), { wrapper })
    const res = await result.current.mutateAsync({
      demands: [
        { demandId: 1, label: "PRD-001" },
        { demandId: 2, label: "PRD-002" },
      ],
      targetMonth: "2026-08",
    })

    expect(post).toHaveBeenCalledTimes(2)
    expect(res.succeeded).toBe(1)
    expect(res.failed).toBe(1)
  })

  it("treats a transport-level rejection as a failed row too", async () => {
    post.mockRejectedValueOnce(new Error("HTTP error 500")).mockResolvedValueOnce(ok())

    const { result } = renderHook(() => useBulkCarryForwardAsIs(), { wrapper })
    const res = await result.current.mutateAsync({
      demands: [
        { demandId: 1, label: "PRD-001" },
        { demandId: 2, label: "PRD-002" },
      ],
      targetMonth: "2026-08",
    })

    expect(res.failed).toBe(1)
    expect(res.outcomes[0].error).toBe("HTTP error 500")
  })

  it("posts CARRY_AS_IS for every row in the batch", async () => {
    post.mockResolvedValue(ok())
    const { result } = renderHook(() => useBulkCarryForwardAsIs(), { wrapper })
    await result.current.mutateAsync({
      demands: [{ demandId: 7, label: "PRD-007" }],
      targetMonth: "2026-08",
    })

    expect(post.mock.calls[0][1]).toMatchObject({
      sourceDemandId: 7,
      action: CarryAction.CARRY_ACTION_CARRY_AS_IS,
      targetMonth: "2026-08",
    })
  })
})

describe("useProcessCarryForward", () => {
  it("rejects when the backend reports a domain failure inside a 200", async () => {
    // The single-row path had the same gap: it toasted "Carry-forward
    // processed" for a demand the backend had refused to carry.
    post.mockResolvedValueOnce(domainFailure("split exceeds remaining quantity"))

    const { result } = renderHook(() => useProcessCarryForward(), { wrapper })

    await expect(
      result.current.mutateAsync({
        sourceDemandId: 1,
        action: CarryAction.CARRY_ACTION_PARTIAL_CARRY,
        targetMonth: "2026-08",
        splits: [],
      })
    ).rejects.toThrow("split exceeds remaining quantity")

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it("resolves when the backend reports success", async () => {
    post.mockResolvedValueOnce(ok())
    const { result } = renderHook(() => useProcessCarryForward(), { wrapper })
    await expect(
      result.current.mutateAsync({
        sourceDemandId: 1,
        action: CarryAction.CARRY_ACTION_CARRY_AS_IS,
        targetMonth: "2026-08",
        splits: [],
      })
    ).resolves.toBeTruthy()
  })
})
