/**
 * ERP integration list page — permission gating, config banner, backtest period
 * exclusion and SHADOW badge.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

let perms: string[] = []
let config = { pushEnabled: true, valuationEnabled: true, adjApproveEnabled: true, writerMode: "disabled", oracleIfConfigured: false }

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }))
vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({ hasPermission: (c: string) => perms.includes(c) }),
}))
vi.mock("@/hooks/finance/use-erp-integration", () => ({
  useErpConfig: () => ({ data: config }),
  useErpSchedule: () => ({ data: undefined }),
  useCreateErpBatch: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRunErpBacktest: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useErpJob: () => ({ data: undefined }),
  useErpBacktestReport: () => ({ data: undefined, isLoading: false }),
  downloadBlob: vi.fn(),
}))

import { ErpBacktestPanel } from "@/components/finance/erp-integration/erp-backtest-panel"
import { ErpConfigBanner } from "@/components/finance/erp-integration/erp-config-banner"
import { ErpBatchesTable } from "@/components/finance/erp-integration/erp-batches-table"

describe("ERP integration list", () => {
  beforeEach(() => {
    perms = []
    config = { pushEnabled: true, valuationEnabled: true, adjApproveEnabled: true, writerMode: "disabled", oracleIfConfigured: false }
  })

  it("hides Run backtest without .trigger", () => {
    perms = ["finance.cost.erpintegration.view"]
    render(<ErpBacktestPanel />)
    expect(screen.queryByText("Run backtest")).toBeNull()
  })

  it("shows Run backtest with .trigger", () => {
    perms = ["finance.cost.erpintegration.view", "finance.cost.erpintegration.trigger"]
    render(<ErpBacktestPanel />)
    expect(screen.getByText("Run backtest")).toBeTruthy()
  })

  it("disables 202605 in the backtest select", () => {
    perms = ["finance.cost.erpintegration.view"]
    render(<ErpBacktestPanel />)
    const opt = screen.getByRole("option", { name: /202605/ }) as HTMLOptionElement
    expect(opt.disabled).toBe(true)
    expect(opt.title).toContain("E-11")
  })

  it("shows the flag-off banner when writer_mode is disabled", () => {
    render(<ErpConfigBanner />)
    expect(screen.getByTestId("erp-config-banner")).toBeTruthy()
    expect(screen.getByText("Oracle writer is disabled")).toBeTruthy()
  })

  it("hides the banner when everything is on", () => {
    config = { ...config, writerMode: "live" }
    render(<ErpConfigBanner />)
    expect(screen.queryByTestId("erp-config-banner")).toBeNull()
  })

  it("shows the SHADOW badge on a SHADOW row", () => {
    render(
      <ErpBatchesTable
        items={[
          {
            batchId: 1, period: "202604", mode: "SHADOW", status: "VALIDATED", seq: 1, createdBy: "u",
            createdAt: "", updatedAt: "", summaryJson: "", progress: 100, allowedActions: [], failedReason: "",
          },
        ]}
        page={1}
        total={1}
        totalPages={1}
        onPageChange={() => {}}
      />
    )
    expect(screen.getByText("SHADOW")).toBeTruthy()
  })
})
