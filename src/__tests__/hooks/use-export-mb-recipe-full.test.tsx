/**
 * Tests for useExportMBRecipeFull (P12 / items C1 + C2).
 *
 * Two things are worth pinning at the hook boundary:
 *
 * 1. The full export must hit its OWN route. `/api/v1/finance/mb-heads/export` is the
 *    round-trip IMPORT format (decision D7) and must stay byte-identical; a hook that
 *    silently pointed there would corrupt that contract with no test failing.
 * 2. Omitted params must travel OMITTED. `period` empty means "latest active period per
 *    head" and `costType` empty means the server default (ACTUAL) — a client-side
 *    default here would put the same decision in two places (D13).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

const get = vi.fn()
const downloadFileFromBytes = vi.fn()

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    apiClient: { ...actual.apiClient, get: (...args: unknown[]) => get(...args) },
    downloadFileFromBytes: (...args: unknown[]) => downloadFileFromBytes(...args),
  }
})

const toastError = vi.fn()
const toastSuccess = vi.fn()
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }))

import { useExportMBRecipeFull } from "@/hooks/finance/use-mb-head"
import { ActiveFilter } from "@/types/finance/mb-head"

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

/** A BFF envelope shaped the way the export-full proxy actually returns one. */
const okEnvelope = (fileContentBase64: string) => ({
  base: { isSuccess: true, statusCode: "200", message: "OK", validationErrors: [] },
  fileContent: fileContentBase64,
  fileName: "mb_recipe_full_export.xlsx",
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("useExportMBRecipeFull", () => {
  it("calls the dedicated export-full route, never the round-trip export route", async () => {
    get.mockResolvedValue(okEnvelope(Buffer.from("xlsx").toString("base64")))

    const { result } = renderHook(() => useExportMBRecipeFull(), { wrapper })
    result.current.mutate({})

    await waitFor(() => expect(get).toHaveBeenCalled())
    const url = get.mock.calls[0][0] as string
    expect(url).toContain("/api/v1/finance/mb-heads/export-full")
    // The legacy route is a strict prefix of nothing here — assert it is not the target.
    expect(url.startsWith("/api/v1/finance/mb-heads/export?")).toBe(false)
  })

  it("omits period and costType when the caller omits them", async () => {
    get.mockResolvedValue(okEnvelope(Buffer.from("xlsx").toString("base64")))

    const { result } = renderHook(() => useExportMBRecipeFull(), { wrapper })
    result.current.mutate({})

    await waitFor(() => expect(get).toHaveBeenCalled())
    const url = get.mock.calls[0][0] as string
    expect(url).not.toContain("period=")
    expect(url).not.toContain("cost_type=")
  })

  it("forwards an explicit period, cost type and active filter", async () => {
    get.mockResolvedValue(okEnvelope(Buffer.from("xlsx").toString("base64")))

    const { result } = renderHook(() => useExportMBRecipeFull(), { wrapper })
    result.current.mutate({
      activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE,
      period: "202607",
      costType: "SELLING",
    })

    await waitFor(() => expect(get).toHaveBeenCalled())
    const url = get.mock.calls[0][0] as string
    expect(url).toContain("period=202607")
    // buildQueryString snake-cases keys, which is why the BFF route reads BOTH
    // `costType`/`cost_type` and `activeFilter`/`active_filter`.
    expect(url).toContain("cost_type=SELLING")
    expect(url).toContain(`active_filter=${ActiveFilter.ACTIVE_FILTER_ACTIVE}`)
  })

  it("omits checkStatusCalc entirely when the caller omits it", async () => {
    // ⛔ This is the load-bearing assertion for the filter's semantics: an absent
    // derived-check-status must produce NO query param, which the BFF forwards as the
    // empty string and the SQL reads as "no filter" — so every head, including the ones
    // whose derived status is still NULL ("Belum dihitung"), stays in the workbook. A
    // client-side default here would silently drop those heads from a plain export.
    get.mockResolvedValue(okEnvelope(Buffer.from("xlsx").toString("base64")))

    const { result } = renderHook(() => useExportMBRecipeFull(), { wrapper })
    result.current.mutate({})

    await waitFor(() => expect(get).toHaveBeenCalled())
    const url = get.mock.calls[0][0] as string
    expect(url).not.toContain("check_status_calc")
    expect(url).not.toContain("checkStatusCalc")
  })

  it("forwards an explicit checkStatusCalc verbatim, including statuses nothing produces yet", async () => {
    // "Approved" is one of the three values DeriveCheckStatus actually produces today;
    // "Outdated" is one of the three that are legal per chk_mbh_check_status_calc
    // (migration 000487) but unreachable until the matching user gates are decided. Both
    // must travel untouched — an empty workbook for "Outdated" is a correct answer, ⛔ not
    // something the hook should normalise away.
    for (const status of ["Approved", "Outdated"] as const) {
      get.mockReset()
      get.mockResolvedValue(okEnvelope(Buffer.from("xlsx").toString("base64")))

      const { result } = renderHook(() => useExportMBRecipeFull(), { wrapper })
      result.current.mutate({ checkStatusCalc: status })

      await waitFor(() => expect(get).toHaveBeenCalled())
      const url = get.mock.calls[0][0] as string
      // buildQueryString snake-cases keys, which is why the BFF route reads BOTH spellings.
      expect(url).toContain(`check_status_calc=${status}`)
    }
  })

  it("downloads the workbook on a successful envelope", async () => {
    get.mockResolvedValue(okEnvelope(Buffer.from("xlsx").toString("base64")))

    const { result } = renderHook(() => useExportMBRecipeFull(), { wrapper })
    result.current.mutate({})

    await waitFor(() => expect(downloadFileFromBytes).toHaveBeenCalled())
    expect(downloadFileFromBytes.mock.calls[0][1]).toBe("mb_recipe_full_export.xlsx")
    expect(toastSuccess).toHaveBeenCalled()
  })

  it("does not download when the envelope reports a domain failure", async () => {
    // HTTP 200 with isSuccess=false — apiClient resolves, so the failure is only
    // visible inside the envelope. A 403 from the permission gate lands here.
    get.mockResolvedValue({
      base: { isSuccess: false, statusCode: "403", message: "permission denied", validationErrors: [] },
      fileContent: "",
      fileName: "",
    })

    const { result } = renderHook(() => useExportMBRecipeFull(), { wrapper })
    result.current.mutate({})

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(downloadFileFromBytes).not.toHaveBeenCalled()
    expect(toastError.mock.calls[0][0]).toContain("permission denied")
  })

  it("does not download an empty workbook even when the envelope claims success", async () => {
    get.mockResolvedValue(okEnvelope(""))

    const { result } = renderHook(() => useExportMBRecipeFull(), { wrapper })
    result.current.mutate({})

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(downloadFileFromBytes).not.toHaveBeenCalled()
  })
})
