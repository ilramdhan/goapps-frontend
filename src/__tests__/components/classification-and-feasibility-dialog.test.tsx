/**
 * Tests for ClassificationAndFeasibilityDialog's extended phase state machine
 * (P3-T3, design.md §3 Area B / B1): idle -> classifying -> classified ->
 * routing -> deciding -> done, with RoutingResolver rendered inline when the
 * decision is FEASIBLE and the submit button gated on `resolvedHeadId`.
 *
 * Covers:
 *  - happy path: Classification -> Routing resolve -> LinkRoute -> Feasibility
 *  - submit is disabled until RoutingResolver has resolved a head id
 *  - a routing-link failure leaves classification saved and only retries the
 *    routing step (not a full restart)
 *  - a feasibility failure after a successful routing link only retries
 *    feasibility, never re-submitting the already-linked route
 *  - verified === "new" forces RoutingResolver straight into the new-product
 *    form (no existing-product picker)
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// ─── Module mocks ─────────────────────────────────────────────────────────────

const verifyMutateAsync = vi.fn()
const linkRouteMutateAsync = vi.fn()
const feasibilityMutateAsync = vi.fn()
const submitAndDecideMutateAsync = vi.fn()

vi.mock("@/hooks/finance/use-cost-product-request", () => ({
  useVerifyClassification: () => ({ mutateAsync: verifyMutateAsync, isPending: false }),
  useDecideFeasibility: () => ({ mutateAsync: feasibilityMutateAsync, isPending: false }),
  // P3-T6 wires mode="submit" through useSubmitAndDecide; this test file only
  // exercises mode="reviewDecide" (the pre-existing UNDER_REVIEW flow), but the
  // dialog calls the hook unconditionally at the top level regardless of mode,
  // so it must always be mocked here even though these tests never invoke it.
  useSubmitAndDecide: () => ({ mutateAsync: submitAndDecideMutateAsync, isPending: false }),
}))

vi.mock("@/hooks/finance/use-link-route", () => ({
  useLinkExistingRoute: () => ({ mutateAsync: linkRouteMutateAsync, isPending: false }),
}))

vi.mock("@/hooks/finance/use-cost-product-master", () => ({
  useCostProductMaster: () => ({ data: undefined }),
  useCostProductMasters: () => ({ data: { items: [] }, isLoading: false }),
}))

// RoutingResolver is exercised by its own test file (routing-resolver.test.tsx);
// here it's stubbed to a single "Resolve routing" button that immediately
// invokes onResolved(999), or nothing when `failOnce` mode is toggled on via a
// second button — this keeps the dialog's own phase-machine tests focused on
// the dialog, not RoutingResolver's internal branching.
let forceNewProductSeen: boolean | undefined
vi.mock("@/components/finance/cost-product-request/routing-resolver", () => ({
  RoutingResolver: ({
    onResolved,
    forceNewProduct,
  }: {
    onResolved: (headId: number) => void
    forceNewProduct?: boolean
  }) => {
    forceNewProductSeen = forceNewProduct
    return (
      <button type="button" onClick={() => onResolved(999)}>
        resolve-routing
      </button>
    )
  },
}))

// ─── Import under test (after all mocks are registered) ──────────────────────

import { ClassificationAndFeasibilityDialog } from "@/components/finance/cost-product-request/transition-dialogs"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderDialog(overrides: Partial<Parameters<typeof ClassificationAndFeasibilityDialog>[0]> = {}) {
  const onOpenChange = vi.fn()
  render(
    <ClassificationAndFeasibilityDialog
      open
      onOpenChange={onOpenChange}
      requestId={7}
      currentClassification="existing"
      referenceProductSysId={42}
      {...overrides}
    />,
  )
  return { onOpenChange }
}

async function resolveRoutingViaUI() {
  await userEvent.click(screen.getByRole("button", { name: "resolve-routing" }))
}

function submitButton() {
  return screen.getByRole("button", { name: /save & continue|retry routing link|retry feasibility/i })
}

describe("ClassificationAndFeasibilityDialog — extended phase machine (routing)", () => {
  beforeEach(() => {
    verifyMutateAsync.mockReset()
    linkRouteMutateAsync.mockReset()
    feasibilityMutateAsync.mockReset()
    forceNewProductSeen = undefined
  })

  it("gates submit on resolvedHeadId being set", async () => {
    renderDialog()

    // Before routing is resolved, submit is disabled.
    expect(submitButton()).toBeDisabled()

    await resolveRoutingViaUI()

    expect(submitButton()).toBeEnabled()
  })

  it("runs the full chain Classification -> Routing resolve -> LinkRoute -> Feasibility on success", async () => {
    verifyMutateAsync.mockResolvedValue({})
    linkRouteMutateAsync.mockResolvedValue({})
    feasibilityMutateAsync.mockResolvedValue({})
    const { onOpenChange } = renderDialog()

    await resolveRoutingViaUI()
    await userEvent.click(submitButton())

    expect(verifyMutateAsync).toHaveBeenCalledTimes(1)
    expect(linkRouteMutateAsync).toHaveBeenCalledTimes(1)
    expect(linkRouteMutateAsync).toHaveBeenCalledWith({ requestId: 7, routeHeadId: 999 })
    expect(feasibilityMutateAsync).toHaveBeenCalledTimes(1)

    // Ordering: verify called before link, link called before feasibility.
    const verifyOrder = verifyMutateAsync.mock.invocationCallOrder[0]
    const linkOrder = linkRouteMutateAsync.mock.invocationCallOrder[0]
    const feasibilityOrder = feasibilityMutateAsync.mock.invocationCallOrder[0]
    expect(verifyOrder).toBeLessThan(linkOrder)
    expect(linkOrder).toBeLessThan(feasibilityOrder)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("routing-failure-then-retry: LinkRoute failing leaves classification saved and only re-runs routing on retry", async () => {
    verifyMutateAsync.mockResolvedValue({})
    linkRouteMutateAsync.mockRejectedValueOnce(new Error("link failed")).mockResolvedValueOnce({})
    feasibilityMutateAsync.mockResolvedValue({})
    renderDialog()

    await resolveRoutingViaUI()
    await userEvent.click(submitButton())

    // First attempt: classification saved, routing failed — inline error shown,
    // classification section now read-only, submit button relabeled to retry routing.
    expect(await screen.findByText(/linking the route failed/i)).toBeInTheDocument()
    expect(verifyMutateAsync).toHaveBeenCalledTimes(1)
    expect(linkRouteMutateAsync).toHaveBeenCalledTimes(1)
    expect(feasibilityMutateAsync).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: /retry routing link/i })).toBeInTheDocument()

    // Retry: classification must NOT be re-submitted; routing link retried; then feasibility runs.
    await userEvent.click(screen.getByRole("button", { name: /retry routing link/i }))

    expect(verifyMutateAsync).toHaveBeenCalledTimes(1)
    expect(linkRouteMutateAsync).toHaveBeenCalledTimes(2)
    expect(feasibilityMutateAsync).toHaveBeenCalledTimes(1)
  })

  it("feasibility-failure-then-retry: once routing already linked, retry never re-submits LinkRoute", async () => {
    verifyMutateAsync.mockResolvedValue({})
    linkRouteMutateAsync.mockResolvedValue({})
    feasibilityMutateAsync.mockRejectedValueOnce(new Error("feasibility failed")).mockResolvedValueOnce({})
    renderDialog()

    await resolveRoutingViaUI()
    await userEvent.click(submitButton())

    expect(await screen.findByText(/feasibility decision failed/i)).toBeInTheDocument()
    expect(linkRouteMutateAsync).toHaveBeenCalledTimes(1)
    expect(feasibilityMutateAsync).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: /retry feasibility/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /retry feasibility/i }))

    // LinkRoute must not be called again — routeLinked already true.
    expect(linkRouteMutateAsync).toHaveBeenCalledTimes(1)
    expect(feasibilityMutateAsync).toHaveBeenCalledTimes(2)
  })

  it("forces RoutingResolver into new-product mode when verified classification is 'new'", async () => {
    renderDialog({ currentClassification: "pending" })

    // Switch the classification radio to "new".
    await userEvent.click(screen.getByRole("radio", { name: "New" }))

    expect(forceNewProductSeen).toBe(true)
  })

  it("does not render the routing section at all when NOT_FEASIBLE is chosen", async () => {
    renderDialog()

    await userEvent.click(screen.getByRole("radio", { name: "Not feasible" }))

    expect(screen.queryByRole("button", { name: "resolve-routing" })).not.toBeInTheDocument()
  })
})
