/**
 * Tests for PlanCarryPanel — the Plan Items scope of Start New Month
 * (PLAN-05 / spec S-2.2).
 *
 * What these exist for:
 *   1. The double-count rule. A plan item's qty_target is its claim on a demand
 *      and work orders consume part of that claim, so the panel must offer and
 *      carry `qtyUncovered`, never `qtyTarget`. Getting this wrong re-books
 *      production already committed against the same demand.
 *   2. Nothing may be silently omitted. A fully-covered or already-carried item
 *      is listed with its reason instead of disappearing.
 *   3. Action copy must describe what the backend actually does. PLAN-04 shipped
 *      a description that flattered its label and was false; these pin the two
 *      claims most likely to drift.
 *   4. Zero candidates must explain itself rather than render an empty table.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { PlanCarryCandidate } from "@/types/ppc/plan-item"

// ─── jsdom gaps Radix Select depends on ──────────────────────────────────────
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => {}
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

// ─── Module mocks ─────────────────────────────────────────────────────────────

const candidatesResult: { data: PlanCarryCandidate[] | undefined; isLoading: boolean } = {
  data: [],
  isLoading: false,
}
const bulkMutateAsync = vi.fn()
const processMutateAsync = vi.fn()

vi.mock("@/hooks/ppc/use-plan-item-carry", () => ({
  usePlanCarryForwardCandidates: () => candidatesResult,
  useProcessPlanCarryForward: () => ({ mutateAsync: processMutateAsync, isPending: false }),
  useBulkPlanCarryForwardAsIs: () => ({ mutateAsync: bulkMutateAsync, isPending: false }),
}))

import { PlanCarryPanel } from "@/components/ppc/plan/plan-carry-panel"

// ─── Helpers ─────────────────────────────────────────────────────────────────

type PlanItemOf = NonNullable<PlanCarryCandidate["item"]>

/**
 * Build one candidate. `item` merges into the base plan item rather than
 * replacing it, so a test that only cares about the id does not have to spell
 * out all 22 proto fields.
 */
function candidate(
  overrides: Partial<Omit<PlanCarryCandidate, "item">> & { item?: Partial<PlanItemOf> } = {}
): PlanCarryCandidate {
  const { item, ...rest } = overrides
  return {
    item: {
      planItemId: 1,
      cpmProductSysId: 55,
      productCode: "PRD-001",
      productName: "Yarn 30s",
      qtyTarget: "500",
      deadline: "2026-08-20",
      month: "2026-08",
      ...item,
    } as PlanItemOf,
    qtyUncovered: "500",
    qtyCovered: "0",
    workOrderCount: 0,
    alreadyCarried: false,
    demandLabel: "CT-9",
    ...rest,
  } as PlanCarryCandidate
}

function renderPanel() {
  return render(
    <PlanCarryPanel open sourceMonth="2026-08" targetMonth="2026-09" onClose={() => {}} />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  candidatesResult.data = []
  candidatesResult.isLoading = false
})

// ─── Discoverability ─────────────────────────────────────────────────────────

describe("PlanCarryPanel discoverability", () => {
  it("renders a visible, labelled carry button on every offerable row", () => {
    candidatesResult.data = [candidate()]
    renderPanel()
    expect(screen.getByRole("button", { name: /carry forward/i })).toBeInTheDocument()
  })

  it("names the demand a plan item serves in words, never as an id", () => {
    candidatesResult.data = [candidate({ demandLabel: "CT-9" })]
    renderPanel()
    expect(screen.getByText(/Contract CT-9/)).toBeInTheDocument()
  })

  it("says an item is upstream of another rather than showing a blank cell", () => {
    candidatesResult.data = [candidate({ demandLabel: "" })]
    renderPanel()
    expect(screen.getByText(/upstream of another item/i)).toBeInTheDocument()
  })
})

// ─── The double-count rule (S-2.2) ───────────────────────────────────────────

describe("PlanCarryPanel quantity is the uncovered quantity", () => {
  it("shows what is left to carry, not the plan item's whole target", () => {
    candidatesResult.data = [
      candidate({ qtyUncovered: "200", qtyCovered: "300", workOrderCount: 1 }),
    ]
    renderPanel()

    // 200 appears twice on purpose — once in the row, once in the summary
    // total — so assert on the count rather than uniqueness.
    expect(screen.getAllByText("200").length).toBeGreaterThan(0)
    expect(screen.getByText(/300 on 1 work order/)).toBeInTheDocument()
    // The 500 target must never be the number offered.
    expect(screen.queryByText("500")).not.toBeInTheDocument()
  })

  it("totals only the uncovered quantity across offerable rows", () => {
    candidatesResult.data = [
      candidate({ item: { planItemId: 1, qtyTarget: "500" }, qtyUncovered: "200" }),
      candidate({ item: { planItemId: 2, qtyTarget: "500" }, qtyUncovered: "150" }),
    ]
    renderPanel()
    expect(screen.getByText("350")).toBeInTheDocument()
  })

  it("excludes fully-covered and already-carried rows from the bulk count", () => {
    candidatesResult.data = [
      candidate({ item: { planItemId: 1 }, qtyUncovered: "200" }),
      candidate({ item: { planItemId: 2 }, qtyUncovered: "0" }),
      candidate({ item: { planItemId: 3 }, qtyUncovered: "90", alreadyCarried: true }),
    ]
    renderPanel()
    // One of three is actually carryable, and the button must not promise three.
    expect(screen.getByRole("button", { name: /carry all as-is \(1\)/i })).toBeInTheDocument()
  })
})

// ─── Nothing is silently omitted ─────────────────────────────────────────────

describe("PlanCarryPanel states why a row cannot be carried", () => {
  it("lists a fully-covered item with its reason instead of hiding it", () => {
    candidatesResult.data = [
      candidate({ qtyUncovered: "0", qtyCovered: "500", workOrderCount: 2 }),
    ]
    renderPanel()

    expect(screen.getByText("PRD-001")).toBeInTheDocument()
    expect(screen.getByText(/fully covered by work orders/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /carry forward/i })).not.toBeInTheDocument()
  })

  it("shows an already-carried item as carried rather than offering it again", () => {
    candidatesResult.data = [candidate({ alreadyCarried: true })]
    renderPanel()

    expect(screen.getByText(/in september 2026/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /carry forward/i })).not.toBeInTheDocument()
  })
})

// ─── Action copy is derived from the backend ─────────────────────────────────

describe("PlanCarryPanel action copy is derived from the backend", () => {
  it("says CARRY_AS_IS leaves the original alone, because carry_forward.go does not close it", async () => {
    candidatesResult.data = [candidate()]
    renderPanel()
    await userEvent.click(screen.getByRole("button", { name: /carry forward/i }))

    // createCarriedItem explicitly does NOT mark the source carried-over, unlike
    // the demand equivalent. Claiming otherwise would be the PLAN-04 defect.
    expect(screen.getByText(/original stays in its own month/i)).toBeInTheDocument()
  })

  it("does not claim a partial carry writes off the remainder", async () => {
    candidatesResult.data = [candidate()]
    renderPanel()
    await userEvent.click(screen.getByRole("button", { name: /carry forward/i }))

    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(screen.getByRole("option", { name: /partial carry/i }))

    // The demand's PARTIAL_CARRY drops the uncarried remainder; the plan item's
    // does not, because the source is never touched.
    await waitFor(() =>
      expect(screen.getByText(/stays plannable in its own month/i)).toBeInTheDocument()
    )
    expect(screen.queryByText(/written off/i)).not.toBeInTheDocument()
  })

  it("hides the target month and deadline for the action that creates nothing", async () => {
    candidatesResult.data = [candidate()]
    renderPanel()
    await userEvent.click(screen.getByRole("button", { name: /carry forward/i }))

    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(screen.getByRole("option", { name: /^close$/i }))

    await waitFor(() =>
      expect(screen.getByText(/creates nothing in another month/i)).toBeInTheDocument()
    )
    expect(screen.queryByLabelText(/new deadline/i)).not.toBeInTheDocument()
  })
})

// ─── Destructive guard ───────────────────────────────────────────────────────

describe("PlanCarryPanel destructive guard", () => {
  it("confirms before closing a plan item and only submits once confirmed", async () => {
    candidatesResult.data = [candidate()]
    renderPanel()
    await userEvent.click(screen.getByRole("button", { name: /carry forward/i }))
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(screen.getByRole("option", { name: /^close$/i }))

    await userEvent.click(screen.getByRole("button", { name: /close this plan item/i }))
    expect(processMutateAsync).not.toHaveBeenCalled()

    // CLOSED is terminal in the plan-item state machine, and the copy says so
    // in two places: the action description and the confirmation body.
    await waitFor(() =>
      expect(screen.getAllByText(/cannot be reopened/i).length).toBeGreaterThan(1)
    )
    await userEvent.click(screen.getByRole("button", { name: /^close plan item$/i }))
    await waitFor(() => expect(processMutateAsync).toHaveBeenCalledTimes(1))
  })
})

// ─── Empty state ─────────────────────────────────────────────────────────────

describe("PlanCarryPanel empty state", () => {
  it("explains why nothing is listed instead of rendering an empty table", () => {
    candidatesResult.data = []
    renderPanel()

    expect(screen.getByText(/nothing to carry from august 2026/i)).toBeInTheDocument()
    // The actual backend predicate: ppi_status IN ('DRAFT','CONFIRMED').
    expect(screen.getByText(/still draft or confirmed/i)).toBeInTheDocument()
  })
})
