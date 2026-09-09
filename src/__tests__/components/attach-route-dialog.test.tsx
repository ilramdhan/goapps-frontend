/**
 * Tests for AttachRouteDialog — F3 (design.md §3): pick an existing route
 * belonging to a different product, review a copy-summary, then attach it
 * onto the target product. Covers:
 *  - pick step lists candidate routes (excluding the target product itself)
 *  - selecting a candidate advances to the confirm step and shows the level
 *    summary + copy-semantics note
 *  - confirming calls useAttachRoute with the right payload and surfaces the
 *    new head id via onAttached
 *  - the 409 "target already has a route" conflict renders an inline notice,
 *    not a raw error
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CostRouteHead, RouteGraph } from "@/types/finance/cost-route"

// ─── Module mocks ─────────────────────────────────────────────────────────────

let routesData: { items: CostRouteHead[] } = { items: [] }
let graphData: RouteGraph | null = null
const attachMutateAsync = vi.fn()

vi.mock("@/hooks/finance/use-cost-route", () => ({
  useRoutes: () => ({ data: routesData, isLoading: false }),
  useRouteGraph: () => ({ data: graphData, isLoading: false }),
}))

const { MockAttachRouteConflictError } = vi.hoisted(() => ({
  MockAttachRouteConflictError: class extends Error {},
}))

vi.mock("@/hooks/finance/use-attach-route", () => ({
  useAttachRoute: () => ({ mutateAsync: attachMutateAsync, isPending: false }),
  AttachRouteConflictError: MockAttachRouteConflictError,
}))

// ─── Import under test (after mocks are registered) ───────────────────────────

import { AttachRouteDialog } from "@/components/finance/cost-route/attach-route-dialog"
import { AttachRouteConflictError } from "@/hooks/finance/use-attach-route"

function baseHead(overrides: Partial<CostRouteHead> = {}): CostRouteHead {
  return {
    headId: 500,
    productSysId: 10,
    productCode: "SRC-A",
    productName: "Product A",
    routingStatus: "COMPLETE",
    version: 1,
    lockedBy: "",
    lockedAt: "",
    unlockedBy: "",
    unlockedAt: "",
    levelCount: 3,
    rmCount: 5,
    ...overrides,
  }
}

function renderDialog(onAttached = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <AttachRouteDialog
        open
        onClose={vi.fn()}
        targetProductSysId={99}
        targetProductCode="TGT-B"
        targetProductName="Product B"
        linkedRequestId={7}
        onAttached={onAttached}
      />
    </QueryClientProvider>,
  )
  return { onAttached }
}

describe("AttachRouteDialog", () => {
  beforeEach(() => {
    attachMutateAsync.mockReset()
    routesData = { items: [] }
    graphData = null
  })

  it("lists candidate routes, excluding the target product itself", () => {
    routesData = {
      items: [
        baseHead({ headId: 500, productSysId: 10, productCode: "SRC-A" }),
        // same as target product -> must be filtered out
        baseHead({ headId: 600, productSysId: 99, productCode: "TGT-B" }),
        // zero levels -> must be filtered out (nothing to attach)
        baseHead({ headId: 700, productSysId: 11, productCode: "EMPTY-C", levelCount: 0 }),
      ],
    }

    renderDialog()

    expect(screen.getByText("SRC-A")).toBeInTheDocument()
    expect(screen.queryByText("TGT-B")).not.toBeInTheDocument()
    expect(screen.queryByText("EMPTY-C")).not.toBeInTheDocument()
  })

  it("advances to confirm step with source/target summary and level breakdown on pick", async () => {
    routesData = { items: [baseHead()] }
    graphData = {
      head: baseHead(),
      seqs: [
        {
          uid: "1",
          seqId: 1,
          headId: 500,
          productSysId: 20,
          productCode: "MASTERBATCH",
          routeLevel: 3,
          routeSeq: 1,
          positionX: 0,
          positionY: 0,
          rms: [],
        },
        {
          uid: "2",
          seqId: 2,
          headId: 500,
          productSysId: 21,
          productCode: "POY",
          routeLevel: 2,
          routeSeq: 1,
          positionX: 0,
          positionY: 0,
          rms: [],
        },
        {
          uid: "3",
          seqId: 3,
          headId: 500,
          productSysId: 10,
          productCode: "SRC-A",
          routeLevel: 1,
          routeSeq: 1,
          positionX: 0,
          positionY: 0,
          rms: [],
        },
      ],
    }

    renderDialog()

    await userEvent.click(screen.getByText("SRC-A"))

    expect(await screen.findByText(/confirm what will be copied/i)).toBeInTheDocument()
    // Level summary reads upstream -> FG.
    expect(screen.getByText("MASTERBATCH → POY → SRC-A")).toBeInTheDocument()
    // Both source and target product identity are shown before commit
    // (target code also appears inside the "what gets copied" note).
    expect(screen.getAllByText("TGT-B").length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: /attach route/i })).toBeEnabled()
  })

  it("submits the attach with source head id, target product, and linked request id", async () => {
    routesData = { items: [baseHead()] }
    attachMutateAsync.mockResolvedValue({ newHeadId: 999 })
    const { onAttached } = renderDialog()

    await userEvent.click(screen.getByText("SRC-A"))
    await userEvent.click(await screen.findByRole("button", { name: /attach route/i }))

    await waitFor(() => {
      expect(attachMutateAsync).toHaveBeenCalledWith({
        sourceHeadId: 500,
        targetProductSysId: 99,
        linkedRequestId: 7,
      })
    })
    expect(onAttached).toHaveBeenCalledWith(999)
  })

  it("shows an inline conflict notice instead of a raw error when the target already has a route", async () => {
    routesData = { items: [baseHead()] }
    attachMutateAsync.mockRejectedValue(
      new AttachRouteConflictError("Product B already has an active route."),
    )
    const { onAttached } = renderDialog()

    await userEvent.click(screen.getByText("SRC-A"))
    await userEvent.click(await screen.findByRole("button", { name: /attach route/i }))

    expect(await screen.findByText(/can.t attach route/i)).toBeInTheDocument()
    expect(onAttached).not.toHaveBeenCalled()
  })
})
