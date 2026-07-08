/**
 * Tests for RoutingResolver — P3-T1: unified link-vs-create routing entry
 * point (design.md §3, Area B / B1+B2). Covers all 3 branches:
 *  - existing route found        → useLinkExistingRoute is invoked
 *  - no route found (has product)→ useCreateRouteFromProduct is invoked directly
 *  - brand-new-product toggle    → useCreateCostProductMaster then
 *                                   useCreateRouteFromProduct are invoked, in order
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CostRouteHead } from "@/types/finance/cost-route"

// ─── Module mocks ─────────────────────────────────────────────────────────────

const linkMutateAsync = vi.fn()
const createFromProductMutateAsync = vi.fn()
const createProductMutateAsync = vi.fn()

let routeByProductData: CostRouteHead | null = null

vi.mock("@/hooks/finance/use-cost-route", () => ({
  useRouteByProduct: vi.fn(() => ({ data: routeByProductData, isLoading: false })),
  useCreateRouteFromProduct: () => ({ mutateAsync: createFromProductMutateAsync, isPending: false }),
}))

vi.mock("@/hooks/finance/use-link-route", () => ({
  useLinkExistingRoute: () => ({ mutateAsync: linkMutateAsync, isPending: false }),
}))

vi.mock("@/hooks/finance/use-cost-product-master", () => ({
  useCreateCostProductMaster: () => ({ mutateAsync: createProductMutateAsync, isPending: false }),
}))

vi.mock("@/components/finance/comboboxes/product-master-combobox", () => ({
  ProductMasterCombobox: ({
    onChange,
  }: {
    onChange: (productSysId: number, productCode: string, productName: string) => void
  }) => (
    <button type="button" onClick={() => onChange(42, "PM-42", "Existing Product")}>
      pick-product
    </button>
  ),
}))

vi.mock("@/components/finance/comboboxes/product-type-combobox", () => ({
  ProductTypeCombobox: ({ onChange }: { onChange: (typeId: number, code: string, name: string) => void }) => (
    <button type="button" onClick={() => onChange(9, "TYPE9", "Type 9")}>
      pick-product-type
    </button>
  ),
}))

// ─── Import under test (after all mocks are registered) ──────────────────────

import { RoutingResolver } from "@/components/finance/cost-product-request/routing-resolver"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseHead(overrides: Partial<CostRouteHead> = {}): CostRouteHead {
  return {
    headId: 100,
    productSysId: 42,
    routingStatus: "DRAFT",
    version: 1,
    lockedBy: "",
    lockedAt: "",
    unlockedBy: "",
    unlockedAt: "",
    levelCount: 0,
    rmCount: 0,
    ...overrides,
  }
}

function renderResolver(onResolved: (headId: number) => void) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <RoutingResolver requestId={7} onResolved={onResolved} />
    </QueryClientProvider>,
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RoutingResolver", () => {
  beforeEach(() => {
    linkMutateAsync.mockReset()
    createFromProductMutateAsync.mockReset()
    createProductMutateAsync.mockReset()
    routeByProductData = null
  })

  it("links the existing route when useRouteByProduct finds one", async () => {
    routeByProductData = baseHead({ headId: 555 })
    linkMutateAsync.mockResolvedValue({})
    const onResolved = vi.fn()

    renderResolver(onResolved)

    await userEvent.click(screen.getByRole("button", { name: "pick-product" }))
    await userEvent.click(screen.getByRole("button", { name: /resolve routing/i }))

    expect(linkMutateAsync).toHaveBeenCalledTimes(1)
    expect(linkMutateAsync).toHaveBeenCalledWith({ requestId: 7, routeHeadId: 555 })
    expect(createFromProductMutateAsync).not.toHaveBeenCalled()
    expect(createProductMutateAsync).not.toHaveBeenCalled()
    expect(onResolved).toHaveBeenCalledWith(555)
  })

  it("creates a route from the product when no existing route is found", async () => {
    routeByProductData = null
    createFromProductMutateAsync.mockResolvedValue(777)
    const onResolved = vi.fn()

    renderResolver(onResolved)

    await userEvent.click(screen.getByRole("button", { name: "pick-product" }))
    await userEvent.click(screen.getByRole("button", { name: /resolve routing/i }))

    expect(createFromProductMutateAsync).toHaveBeenCalledTimes(1)
    expect(createFromProductMutateAsync).toHaveBeenCalledWith({ productSysId: 42, linkedRequestId: 7 })
    expect(linkMutateAsync).not.toHaveBeenCalled()
    expect(onResolved).toHaveBeenCalledWith(777)
  })

  it("creates the product master then the route when the brand-new-product toggle is used", async () => {
    createProductMutateAsync.mockResolvedValue({ productSysId: 900 })
    createFromProductMutateAsync.mockResolvedValue(901)
    const onResolved = vi.fn()

    renderResolver(onResolved)

    await userEvent.click(screen.getByLabelText(/brand-new product/i))
    await userEvent.type(screen.getByPlaceholderText(/PTY 75\/72/i), "New Product X")
    await userEvent.click(screen.getByRole("button", { name: "pick-product-type" }))
    await userEvent.click(screen.getByRole("button", { name: /resolve routing/i }))

    expect(createProductMutateAsync).toHaveBeenCalledTimes(1)
    expect(createProductMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ productTypeId: 9, productName: "New Product X" }),
    )
    expect(createFromProductMutateAsync).toHaveBeenCalledTimes(1)
    expect(createFromProductMutateAsync).toHaveBeenCalledWith({ productSysId: 900, linkedRequestId: 7 })
    expect(linkMutateAsync).not.toHaveBeenCalled()

    const productCallOrder = createProductMutateAsync.mock.invocationCallOrder[0]
    const routeCallOrder = createFromProductMutateAsync.mock.invocationCallOrder[0]
    expect(productCallOrder).toBeLessThan(routeCallOrder)

    expect(onResolved).toHaveBeenCalledWith(901)
  })
})
