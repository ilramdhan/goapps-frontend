import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, render, renderHook, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

const get = vi.fn()
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api")
  return { ...actual, apiClient: { get: (...a: unknown[]) => get(...a) } }
})

import { useEtlStatus } from "@/hooks/bi/use-etl-status"
import { JobStatusBanner } from "@/components/bi/viewer/job-status-banner"

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  return Wrapper
}

const ok = (data: unknown[]) => ({ base: { isSuccess: true, statusCode: "200", message: "ok", validationErrors: [] }, data })

beforeEach(() => get.mockReset())

describe("useEtlStatus", () => {
  it("calls the etl-status endpoint and parses timestamps", async () => {
    get.mockResolvedValue(ok([{ jobName: "ETL_HR_OT", lastStatus: "SUCCESS", lastRunAt: "2026-10-27T01:00:00Z", lastSuccessAt: "2026-10-27T01:00:00Z" }]))
    const { result } = renderHook(() => useEtlStatus(), { wrapper: wrap() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(get).toHaveBeenCalledWith("/api/v1/finance/bi/etl-status")
    expect(result.current.data?.[0].lastSuccessAt).toBeInstanceOf(Date)
  })
})

describe("JobStatusBanner", () => {
  it("shows last success time without touching jobs/logs endpoints", async () => {
    get.mockResolvedValue(ok([{ jobName: "ETL_HR_OT", lastStatus: "SUCCESS", lastRunAt: "2026-10-27T01:00:00Z", lastSuccessAt: "2026-10-27T01:00:00Z" }]))
    render(<JobStatusBanner />, { wrapper: wrap() })
    expect(await screen.findByText(/Data per/)).toBeTruthy()
    expect(get).toHaveBeenCalledTimes(1)
    expect(get.mock.calls[0][0]).toBe("/api/v1/finance/bi/etl-status")
  })

  it("warns when the latest run failed and keeps the last success", async () => {
    get.mockResolvedValue(ok([
      { jobName: "ETL_HR_OT", lastStatus: "FAILED", lastRunAt: "2026-10-27T03:00:00Z", lastSuccessAt: "2026-10-26T03:00:00Z" },
    ]))
    render(<JobStatusBanner />, { wrapper: wrap() })
    expect(await screen.findByText("Run data terakhir gagal")).toBeTruthy()
    expect(screen.getByText(/Data per/)).toBeTruthy()
  })

  it("renders nothing when there is no HR job status", async () => {
    get.mockResolvedValue(ok([]))
    const { container } = render(<JobStatusBanner />, { wrapper: wrap() })
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))
    await act(async () => { await new Promise(r => setTimeout(r, 20)) })
    expect(container.textContent).toBe("")
  })
})
