/**
 * RM Group per-period hooks (backlog1 T19).
 *
 * - useUpdateRMGroup must invalidate the period-scoped config query for the
 *   edited head + period (mirrors useUpdateGroupItem), otherwise the detail
 *   page / header modal keep showing stale or inherited values.
 * - useGroupPeriodConfig must surface the normalized `inheritedFromPeriod`
 *   provenance on head and details.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import {
  useUpdateRMGroup,
  useGroupPeriodConfig,
  groupPeriodConfigKeys,
} from "@/hooks/finance/use-rm-group"
import type { UpdateRMGroupRequest } from "@/types/finance/rm-group"

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

describe("useUpdateRMGroup — period config invalidation", () => {
  it("invalidates groupPeriodConfigKeys.detail(head, period)", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ base: { isSuccess: true }, data: { groupHeadId: "gh-1" } }),
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const spy = vi.spyOn(qc, "invalidateQueries")

    const { result } = renderHook(() => useUpdateRMGroup(), { wrapper: makeWrapper(qc) })

    await act(async () => {
      await result.current.mutateAsync({
        id: "gh-1",
        data: { groupHeadId: "gh-1", period: "202609" } as UpdateRMGroupRequest,
      })
    })

    expect(spy).toHaveBeenCalledWith({
      queryKey: groupPeriodConfigKeys.detail("gh-1", "202609"),
    })
  })
})

describe("useGroupPeriodConfig — inheritedFromPeriod", () => {
  it("normalizes snake_case provenance on head and details", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        base: { isSuccess: true },
        data: {
          head: { groupHeadId: "gh-1", inherited_from_period: "202608" },
          details: [
            { groupDetailId: "d-1", inheritedFromPeriod: "anchor" },
            { groupDetailId: "d-2" },
          ],
        },
      }),
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useGroupPeriodConfig("gh-1", "202609"), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const data = result.current.data?.data
    expect(data?.inheritedFromPeriod).toBe("202608")
    expect(data?.details?.[0].inheritedFromPeriod).toBe("ANCHOR")
    expect(data?.details?.[1].inheritedFromPeriod).toBe("")
    expect(String(fetchMock.mock.calls[0][0])).toContain("period=202609")
  })
})
