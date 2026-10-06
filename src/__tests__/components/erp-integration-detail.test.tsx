import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { perms, state } = vi.hoisted(() => ({ perms: new Set<string>(), state: { preview: undefined as unknown } }))
vi.mock("@/lib/hooks/use-permission", () => ({ usePermission: () => ({ hasPermission: (c: string) => perms.has(c) }) }))

vi.mock("@/hooks/finance/use-erp-integration", () => {
  const mutation = () => ({ mutate: vi.fn(), isPending: false })
  return {
  useErpConfig: () => ({ data: { writerMode: "disabled", pushEnabled: false, valuationEnabled: false, adjApproveEnabled: false } }),
  useLoadErpDemand: mutation, useRunErpCoverage: mutation, useRunErpDerive: mutation,
  useValidateErpBatch: mutation, useReconErpBatch: mutation, useLockErpBatch: mutation, useAbandonErpBatch: mutation,
  usePreviewErpAdj: () => ({ mutate: (_v: unknown, o?: { onSuccess?: (r: unknown) => void }) => o?.onSuccess?.({ previewId: "p1" }), isPending: false }),
  useExecuteErpAdj: mutation,
  useErpAdjPreview: () => ({ data: state.preview }),
  }
})

import { ErpConfigBanner } from "@/components/finance/erp-integration/erp-config-banner"
import { ErpStepActions } from "@/components/finance/erp-integration/detail/erp-step-actions"
import { TypedConfirm } from "@/components/finance/erp-integration/detail/typed-confirm"
import { AdjValuationTab } from "@/components/finance/erp-integration/detail/tabs/adj-valuation-tab"
import type { ErpBatch } from "@/types/finance/erp-integration"

const batch = (o: Partial<ErpBatch> = {}): ErpBatch =>
  ({ batchId: 7, period: "202601", mode: "LIVE", status: "DEMAND_LOADED", seq: 1, allowedActions: ["COVERED"], progress: 0, summaryJson: "{}", ...o }) as ErpBatch

beforeEach(() => { perms.clear(); state.preview = undefined })
afterEach(() => vi.useRealTimers())

describe("TypedConfirm", () => {
  it("is disabled until exact match", () => {
    render(<TypedConfirm expected="202601/7" label="Go" onConfirm={() => {}} />)
    const btn = screen.getByRole("button", { name: "Go" })
    expect(btn).toBeDisabled()
    fireEvent.change(screen.getByLabelText("Confirmation text"), { target: { value: "202601/7 " } })
    expect(btn).toBeDisabled()
    fireEvent.change(screen.getByLabelText("Confirmation text"), { target: { value: "202601/7" } })
    expect(btn).toBeEnabled()
  })
  it("is disabled after expiry", () => {
    vi.useFakeTimers()
    const exp = new Date(Date.now() + 3000).toISOString()
    render(<TypedConfirm expected="x" expiresAt={exp} label="Go" onConfirm={() => {}} />)
    fireEvent.change(screen.getByLabelText("Confirmation text"), { target: { value: "x" } })
    expect(screen.getByRole("button", { name: "Go" })).toBeEnabled()
    act(() => { vi.advanceTimersByTime(4000) })
    expect(screen.getByRole("button", { name: "Go" })).toBeDisabled()
    expect(screen.getByText("Preview expired: rebuild it")).toBeInTheDocument()
  })
})

describe("ErpStepActions", () => {
  it("hidden without permission", () => {
    render(<ErpStepActions batch={batch()} />)
    expect(screen.queryByText("Run coverage")).toBeNull()
  })
  it("hidden when allowedActions lacks target", () => {
    perms.add("finance.cost.erpintegration.trigger")
    render(<ErpStepActions batch={batch({ allowedActions: [] })} />)
    expect(screen.queryByText("Run coverage")).toBeNull()
  })
  it("shown with permission and allowed target", () => {
    perms.add("finance.cost.erpintegration.trigger")
    render(<ErpStepActions batch={batch()} />)
    expect(screen.getByText("Run coverage")).toBeInTheDocument()
  })
  it("SHADOW has no write buttons", () => {
    perms.add("finance.cost.erpintegration.trigger")
    render(<ErpStepActions batch={batch({ mode: "SHADOW" })} />)
    expect(screen.queryByRole("button")).toBeNull()
  })
})

describe("AdjValuationTab", () => {
  it("V-07 not ok disables execute and lists heads", () => {
    perms.add("finance.cost.erpintegration.valuate")
    state.preview = {
      previewId: "p1", operation: "VALUATE", setHash: "h", headCount: 2, excludedCount: 0, totalAmount: "1",
      v07: { ok: false, offendingHeadIds: ["H-99"] }, heads: [], expiresAt: "",
    }
    render(<AdjValuationTab batch={batch()} />)
    fireEvent.click(screen.getByText("Build preview"))
    expect(screen.getByText("H-99")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Confirmation text"), { target: { value: "202601/7" } })
    expect(screen.getByRole("button", { name: "Execute VALUATE" })).toBeDisabled()
    expect(screen.getByText("This is one period-wide VALUATE_ADJ(P_BATCH_ID) call.")).toBeInTheDocument()
  })
})

describe("ErpConfigBanner", () => {
  it("shows flag-off banner", () => {
    render(<ErpConfigBanner />)
    expect(screen.getByTestId("erp-config-banner")).toBeInTheDocument()
  })
})
