/**
 * ERP integration hooks — query via mocked service, step mutation invalidation,
 * and useErpJob stopping its poll once the job is terminal.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const getBatch = vi.fn()
const runCoverage = vi.fn()
vi.mock("@/services/finance/erp-integration-api", () => ({
  getBatch: (...a: unknown[]) => getBatch(...a),
  runCoverage: (...a: unknown[]) => runCoverage(...a),
}))

const apiGet = vi.fn()
vi.mock("@/lib/api", () => ({
  apiClient: { get: (...a: unknown[]) => apiGet(...a) },
  buildQueryString: () => "",
}))

import {
  useErpBatch,
  useRunErpCoverage,
  useErpJob,
  erpIntegrationKeys,
} from "@/hooks/finance/use-erp-integration"

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}
function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

describe("erp integration hooks", () => {
  beforeEach(() => vi.clearAllMocks())

  it("useErpBatch fetches through the service", async () => {
    getBatch.mockResolvedValue({ batchId: 7 })
    const { result } = renderHook(() => useErpBatch(7), { wrapper: makeWrapper(makeClient()) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getBatch).toHaveBeenCalledWith(7)
    expect(result.current.data).toEqual({ batchId: 7 })
  })

  it("a step mutation invalidates batchDetail", async () => {
    runCoverage.mockResolvedValue({ jobId: "j1", batchId: 7 })
    const qc = makeClient()
    const spy = vi.spyOn(qc, "invalidateQueries")
    const { result } = renderHook(() => useRunErpCoverage(), { wrapper: makeWrapper(qc) })
    result.current.mutate({ batchId: 7 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(runCoverage).toHaveBeenCalledWith(7, {})
    expect(spy).toHaveBeenCalledWith({ queryKey: erpIntegrationKeys.batchDetail(7) })
    expect(spy).toHaveBeenCalledWith({ queryKey: erpIntegrationKeys.batches() })
  })

  it("useErpJob stops polling on a terminal status and invalidates the batch", async () => {
    apiGet.mockResolvedValue({
      base: { isSuccess: true, statusCode: "200", message: "OK", validationErrors: [] },
      data: { jobId: "j1", status: "JOB_STATUS_SUCCESS" },
    })
    const qc = makeClient()
    const spy = vi.spyOn(qc, "invalidateQueries")
    const { result } = renderHook(() => useErpJob("j1", 7), { wrapper: makeWrapper(qc) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ queryKey: erpIntegrationKeys.batchDetail(7) })
    )
    await new Promise((r) => setTimeout(r, 2300))
    expect(apiGet).toHaveBeenCalledTimes(1)
  })
})
