import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactElement } from "react"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { lookupSyncKeys } from "@/components/finance/lookup-sync/use-lookup-sync"
import { LookupUsageBanner } from "@/components/finance/lookup-sync/lookup-usage-banner"
import {
  isLookupSyncJobTerminal,
  normalizeLookupSyncPreview,
  normalizeLookupSyncSummary,
  normalizeLookupSyncJobStatus,
} from "@/types/finance/lookup-sync"

describe("lookup-sync normalizers", () => {
  it("handles camelCase summary", () => {
    const s = normalizeLookupSyncSummary({
      totalProducts: 3, productsWithChanges: 2, totalValueChanges: 5, lockedProducts: 1,
      skipCounts: { LOCKED: 1 }, planFingerprint: "abc",
    })
    expect(s).toEqual({
      totalProducts: 3, productsWithChanges: 2, totalValueChanges: 5, lockedProducts: 1,
      skipCounts: { LOCKED: 1 }, planFingerprint: "abc",
    })
  })
  it("handles snake_case preview and string totalItems", () => {
    const p = normalizeLookupSyncPreview({
      summary: { total_products: 1, plan_fingerprint: "fp" },
      items: [{ product_sys_id: "7", product_code: "P7", skip_reason: "LOCKED",
        changes: [{ param_code: "X", old_value: "1", new_value: "", change_kind: "CLEAR" }] }],
      pagination: { current_page: 2, page_size: 20, total_items: "123", total_pages: 7 },
    })
    expect(p.summary.planFingerprint).toBe("fp")
    expect(p.items[0].productSysId).toBe(7)
    expect(p.items[0].changes[0].changeKind).toBe("CLEAR")
    expect(p.pagination.totalItems).toBe(123)
  })
  it("normalizes job status from data", () => {
    const s = normalizeLookupSyncJobStatus({ data: { jobId: "j", status: "DONE", totalChildren: 2 }, skippedChildren: 1, valuesWritten: 4 })
    expect(s.jobId).toBe("j")
    expect(s.skippedChildren).toBe(1)
    expect(isLookupSyncJobTerminal(s.status)).toBe(true)
    expect(isLookupSyncJobTerminal("PROCESSING")).toBe(false)
  })
})

describe("lookupSyncKeys", () => {
  it("builds stable keys", () => {
    expect(lookupSyncKeys.usage("MACHINE", "M1")).toEqual(["finance", "lookup-sync", "usage", "MACHINE", "M1"])
    expect(lookupSyncKeys.status("j")).toEqual(["finance", "lookup-sync", "job", "status", "j"])
    expect(lookupSyncKeys.failures("j")).toEqual(["finance", "lookup-sync", "job", "failures", "j"])
  })
})

function renderWith(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe("LookupUsageBanner", () => {
  it("is hidden when no products", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ base: { isSuccess: true }, data: { totalProducts: 0, totalValueChanges: 0 } }),
    }) as never
    renderWith(<LookupUsageBanner lookupMasterCode="MACHINE" masterKey="M1" />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.queryByTestId("lookup-usage-banner")).toBeNull()
  })
  it("is visible with changes", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        base: { isSuccess: true },
        data: { totalProducts: 4, productsWithChanges: 2, totalValueChanges: 6, lockedProducts: 1 },
      }),
    }) as never
    renderWith(<LookupUsageBanner lookupMasterCode="MACHINE" masterKey="M1" />)
    expect(await screen.findByTestId("lookup-usage-banner")).toBeTruthy()
    expect(screen.getByText(/Dipakai 4 product/)).toBeTruthy()
    expect(screen.getByRole("button", { name: /Lihat & Terapkan/ })).toBeTruthy()
  })
  it("shows ambiguous MB Spin skips even with no changes", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        base: { isSuccess: true },
        data: { totalProducts: 2, totalValueChanges: 0, lockedProducts: 0, skipCounts: { MB_SPIN_AMBIGUOUS: 2, KEY_EMPTY: 5 } },
      }),
    }) as never
    renderWith(<LookupUsageBanner lookupMasterCode="MB_SPIN" masterKey="S1" />)
    expect(await screen.findByTestId("lookup-usage-banner")).toBeTruthy()
    expect(screen.getByText(/2 dilewati: MB Spin ambigu/)).toBeTruthy()
    expect(screen.queryByText(/KEY_EMPTY/)).toBeNull()
    expect(screen.getByRole("button", { name: /Lihat detail/ })).toBeTruthy()
  })
})
