/**
 * useMasterLookupOptions — productSysId forwarding (oil-cost-rm-group P5-T2).
 *
 * The lookup-master-options mechanism is now filterable by the product being
 * costed (e.g. RM_GROUP_OIL narrowed to the product type's oil class, D11).
 * That filter must (a) be sent to the BFF as a `productSysId` query param and
 * (b) be part of the query key, so two rows on the same page that differ only
 * by productSysId get independently cached results instead of one clobbering
 * the other.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createTestQueryClient } from "../utils"

import { useMasterLookupOptions } from "@/hooks/finance/use-master-lookup"

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ base: { isSuccess: true }, data: [] }),
  })
  vi.stubGlobal("fetch", fetchMock)
})

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = createTestQueryClient()
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useMasterLookupOptions — productSysId", () => {
  it("includes productSysId in the query key so distinct product ids cache independently", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const localWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )

    renderHook(() => useMasterLookupOptions("RM_GROUP_OIL", true, "", 200, 42), {
      wrapper: localWrapper,
    })
    renderHook(() => useMasterLookupOptions("RM_GROUP_OIL", true, "", 200, 99), {
      wrapper: localWrapper,
    })
    renderHook(() => useMasterLookupOptions("RM_GROUP_OIL", true, "", 200, undefined), {
      wrapper: localWrapper,
    })

    const keys = qc.getQueryCache().getAll().map((q) => q.queryKey)
    // Every entry in the key should carry its own productSysId (42, 99, undefined)
    // rather than three renders collapsing onto one shared cache entry.
    expect(keys).toContainEqual(["finance", "master-lookup", "options", "RM_GROUP_OIL", "", 200, 42])
    expect(keys).toContainEqual(["finance", "master-lookup", "options", "RM_GROUP_OIL", "", 200, 99])
    expect(keys).toContainEqual([
      "finance",
      "master-lookup",
      "options",
      "RM_GROUP_OIL",
      "",
      200,
      undefined,
    ])
  })

  it("forwards productSysId as a query param on the BFF request", async () => {
    renderHook(() => useMasterLookupOptions("RM_GROUP_OIL", true, "", 200, 42), { wrapper })

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain("productSysId=42")
  })

  it("omits productSysId from the request when not provided", async () => {
    renderHook(() => useMasterLookupOptions("RM_GROUP_OIL", true, "", 200, undefined), { wrapper })

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).not.toContain("productSysId")
  })
})
