/**
 * Tests for AddRmDialog's B4 "Attach an existing route" splice mode
 * (route-graph-editor.tsx) — covers:
 *  - default mode renders the existing manual PRODUCT/GROUP fields
 *  - the mode toggle switches to the shared route-source-picker UI
 *  - picking a self-referencing source route (one that itself produces the
 *    target route's own head product) is rejected client-side with an
 *    inline error, mirroring the backend's ErrSelfReferencingRoute guard,
 *    and onAttachRoute is never called
 *  - picking a valid, non-self-referencing source route calls onAttachRoute
 *    with the fetched source graph
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CostRouteHead, RouteGraph } from "@/types/finance/cost-route"

// ─── Module mocks ─────────────────────────────────────────────────────────────

let routesData: { items: CostRouteHead[] } = { items: [] }
let graphData: RouteGraph | null = null

vi.mock("@/hooks/finance/use-cost-route", () => ({
  useRoutes: () => ({ data: routesData, isLoading: false }),
  useRouteGraph: () => ({ data: graphData, isLoading: false }),
}))

// AddRmDialog module also imports from use-rm-group (RmGroupCombobox, only
// rendered in manual/GROUP mode) — stub it so the module resolves cleanly.
vi.mock("@/hooks/finance/use-rm-group", () => ({
  useRMGroups: () => ({ data: { data: [] }, isLoading: false }),
}))

// ─── Import under test (after mocks are registered) ───────────────────────────

import { AddRmDialog } from "@/components/finance/cost-route/route-graph-editor"

function baseHead(overrides: Partial<CostRouteHead> = {}): CostRouteHead {
  return {
    headId: 500,
    productSysId: 30,
    productCode: "SRC-A",
    productName: "Product A",
    routingStatus: "COMPLETE",
    version: 1,
    lockedBy: "",
    lockedAt: "",
    unlockedBy: "",
    unlockedAt: "",
    levelCount: 2,
    rmCount: 2,
    ...overrides,
  }
}

function renderDialog(onAttachRoute = vi.fn(), headProductSysId = 100) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <AddRmDialog
        open
        onClose={vi.fn()}
        stageLevel={1}
        upstreamProducts={[]}
        headProductSysId={headProductSysId}
        onAdd={vi.fn()}
        onAttachRoute={onAttachRoute}
      />
    </QueryClientProvider>,
  )
  return { onAttachRoute }
}

describe("AddRmDialog — B4 mode toggle + splice source picker", () => {
  beforeEach(() => {
    routesData = { items: [] }
    graphData = null
  })

  it("defaults to manual mode showing the PRODUCT/GROUP source select", () => {
    renderDialog()
    expect(screen.getByLabelText("Source")).toBeInTheDocument()
    expect(screen.getByLabelText(/ratio per output unit/i)).toBeInTheDocument()
  })

  it("switches to the shared route-source picker when 'Attach an existing route' is toggled", async () => {
    routesData = { items: [baseHead()] }
    renderDialog()

    await userEvent.click(screen.getByRole("button", { name: /attach an existing route/i }))

    expect(screen.getByText("SRC-A")).toBeInTheDocument()
    expect(screen.queryByLabelText("Source")).not.toBeInTheDocument()
  })

  it("rejects a self-referencing source route client-side and never calls onAttachRoute", async () => {
    // Target route's own head product is 100. Source route A's graph
    // includes a seq that itself produces product 100 -- a self-consuming
    // cycle once spliced in.
    routesData = { items: [baseHead({ headId: 500, productSysId: 30, productCode: "SELF-REF" })] }
    graphData = {
      head: baseHead({ headId: 500, productSysId: 30 }),
      seqs: [
        {
          uid: "1",
          seqId: 1,
          headId: 500,
          productSysId: 30,
          productCode: "SELF-REF",
          routeLevel: 1,
          routeSeq: 1,
          positionX: 0,
          positionY: 0,
          rms: [],
        },
        {
          uid: "2",
          seqId: 2,
          headId: 500,
          // Matches the TARGET route's own head product (100) -- cycle.
          productSysId: 100,
          productCode: "TARGET-FG",
          routeLevel: 2,
          routeSeq: 1,
          positionX: 0,
          positionY: 0,
          rms: [],
        },
      ],
    }

    const { onAttachRoute } = renderDialog(vi.fn(), 100)

    await userEvent.click(screen.getByRole("button", { name: /attach an existing route/i }))
    await userEvent.click(screen.getByText("SELF-REF"))

    await userEvent.click(await screen.findByRole("button", { name: /attach route/i }))

    expect(await screen.findByText(/can.t attach this route/i)).toBeInTheDocument()
    expect(onAttachRoute).not.toHaveBeenCalled()
  })

  it("accepts a non-self-referencing source route and calls onAttachRoute with the fetched graph", async () => {
    routesData = { items: [baseHead({ headId: 500, productSysId: 30, productCode: "OK-ROUTE" })] }
    graphData = {
      head: baseHead({ headId: 500, productSysId: 30 }),
      seqs: [
        {
          uid: "1",
          seqId: 1,
          headId: 500,
          productSysId: 30,
          productCode: "OK-ROUTE",
          routeLevel: 1,
          routeSeq: 1,
          positionX: 0,
          positionY: 0,
          rms: [],
        },
      ],
    }

    const { onAttachRoute } = renderDialog(vi.fn(), 100)

    await userEvent.click(screen.getByRole("button", { name: /attach an existing route/i }))
    await userEvent.click(screen.getByText("OK-ROUTE"))
    await userEvent.click(await screen.findByRole("button", { name: /attach route/i }))

    expect(onAttachRoute).toHaveBeenCalledWith(graphData)
  })
})
