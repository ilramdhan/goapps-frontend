/**
 * Tests for CarryForwardWizard — the Start New Month flow (PLAN-04 / spec S-2.1).
 *
 * What these exist for:
 *   1. The carry action must be a *visible, labelled* row button. It used to be
 *      a DataTable RowAction, which renders icon-only on desktop and hides in a
 *      "…" menu on mobile — users reported the modal as having "only a Close
 *      button".
 *   2. Bulk "carry all as-is" loops client-side (there is no batch RPC), so a
 *      partial failure is real. It must never be reported as success, and every
 *      failed row must be named.
 *   3. Zero candidates must explain itself rather than render an empty table.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { Demand } from "@/types/ppc/demand"
import {
  CarryAction as CarryActionEnum,
  DemandStatus as DemandStatusEnum,
} from "@/types/ppc/common"

// ─── jsdom gaps Radix Select depends on ──────────────────────────────────────
// Radix's Select uses Pointer Capture and scrollIntoView, neither of which jsdom
// implements; without these the listbox never opens and every option query
// fails. Kept local rather than added to the shared setup file.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => {}
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

// ─── Module mocks ─────────────────────────────────────────────────────────────

const candidatesResult: { data: Demand[] | undefined; isLoading: boolean } = {
  data: [],
  isLoading: false,
}
const bulkMutateAsync = vi.fn()
const processMutateAsync = vi.fn()

vi.mock("@/hooks/ppc/use-demand", () => {
  // Declared inside the factory: vi.mock is hoisted above the file body, so a
  // top-level class would not exist yet when this runs. The component narrows
  // on `instanceof BulkCarryError`, so the mock must export the very class the
  // component imports, not a lookalike.
  class BulkCarryError extends Error {
    constructor(
      message: string,
      readonly outcomes: unknown[]
    ) {
      super(message)
      this.name = "BulkCarryError"
    }
  }
  return {
    useCarryForwardCandidates: () => candidatesResult,
    useProcessCarryForward: () => ({ mutateAsync: processMutateAsync, isPending: false }),
    useBulkCarryForwardAsIs: () => ({ mutateAsync: bulkMutateAsync, isPending: false }),
    BulkCarryError,
  }
})

import { CarryForwardWizard } from "@/components/ppc/demand/carry-forward-wizard"
import { BulkCarryError } from "@/hooks/ppc/use-demand"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function demand(overrides: Partial<Demand> = {}): Demand {
  return {
    demandId: 1,
    cpmProductSysId: 55,
    productCode: "PRD-001",
    productName: "Yarn 30s",
    qtyRemaining: "100",
    deadline: "2026-07-20",
    contractNo: "CT-9",
    status: DemandStatusEnum.DEMAND_STATUS_CONFIRMED,
    ...overrides,
  } as Demand
}

function renderWizard() {
  return render(<CarryForwardWizard open onOpenChange={() => {}} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  candidatesResult.data = []
  candidatesResult.isLoading = false
})

describe("CarryForwardWizard discoverability (S-2.1)", () => {
  it("renders a visible, labelled carry button on every candidate row", async () => {
    candidatesResult.data = [demand({ demandId: 1 }), demand({ demandId: 2, productCode: "PRD-002" })]
    renderWizard()

    // The regression: this was an icon-only RowAction with no accessible label.
    expect(await screen.findAllByRole("button", { name: /carry forward/i })).toHaveLength(2)
  })

  it("states what the flow does before the user clicks anything", async () => {
    // Static prose, but S-2.1 requires the modal to explain itself *before* any
    // click — the user's original complaint was that it explained nothing. This
    // pins the presence of an up-front explanation, not its wording.
    candidatesResult.data = [demand()]
    renderWizard()
    expect(
      await screen.findByText(/work that was committed but not finished does not move by itself/i)
    ).toBeInTheDocument()
  })

  it("summarises candidate count and total remaining qty up front", async () => {
    candidatesResult.data = [
      demand({ demandId: 1, qtyRemaining: "100" }),
      demand({ demandId: 2, qtyRemaining: "250" }),
    ]
    renderWizard()

    expect(await screen.findByText("Still to handle")).toBeInTheDocument()
    expect(screen.getByText("Total remaining qty")).toBeInTheDocument()
    expect(screen.getByText("350")).toBeInTheDocument()
  })

  it("explains why there is nothing to carry instead of rendering an empty table", async () => {
    candidatesResult.data = []
    renderWizard()

    expect(await screen.findByText(/nothing to carry from/i)).toBeInTheDocument()
    expect(
      screen.getByText(/still has quantity outstanding/i, { exact: false })
    ).toBeInTheDocument()
  })

  it("shows each action's real effect at the point of choice", async () => {
    candidatesResult.data = [demand()]
    renderWizard()

    await userEvent.click(await screen.findByRole("button", { name: /carry forward/i }))
    // Default action is CARRY_AS_IS; its description must name the real effect
    // on the source demand, not just restate the label.
    expect(await screen.findByText(/marked Carried Over/i)).toBeInTheDocument()
  })
})

/**
 * These pin the two descriptions where the label actively misleads, because
 * review caught backend-derived copy being wrong twice in this change. Both
 * assert the *substantive* claim, not the whole sentence, so rewording is free
 * but silently dropping the warning is not.
 */
describe("CarryForwardWizard action copy is derived from the backend", () => {
  async function openAction(label: RegExp) {
    candidatesResult.data = [demand({ qtyRemaining: "100" })]
    renderWizard()
    await userEvent.click(await screen.findByRole("button", { name: /carry forward/i }))
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(await screen.findByRole("option", { name: label }))
  }

  it("warns that PARTIAL_CARRY drops the qty you do not carry", async () => {
    // carryPartial → persistCarry → MarkCarriedOver: the source leaves the
    // candidate pool, so the uncarried remainder is written off. "Partial"
    // suggests the opposite.
    await openAction(/^partial carry$/i)
    expect(await screen.findByText(/the qty you do not carry is dropped/i)).toBeInTheDocument()
  })

  it("does not claim DEFER re-offers the demand next month", async () => {
    // carryDefer only flips status; pd_month is never written, and
    // ListCarryCandidates filters WHERE pd_month = $1. The demand stays a
    // candidate of its *original* month only.
    await openAction(/^defer$/i)
    const copy = await screen.findByText(/is marked Deferred/i)
    // The month is spelled out and is the SOURCE month (the one the demand is
    // already in) — the placeholder must have been substituted.
    const sourceLabel = new Date(
      new Date().getFullYear(),
      new Date().getMonth() - 1,
      1
    ).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    expect(copy).toHaveTextContent(`stays in ${sourceLabel}`)
    expect(copy.textContent).not.toMatch(/\{sourceMonth\}/)
    expect(copy).toHaveTextContent(/not automatically next month/i)
    expect(copy.textContent).not.toMatch(/offered again next month/i)
  })

  it("hides the target month and deadline for actions that create nothing", async () => {
    await openAction(/^defer$/i)
    expect(
      await screen.findByText(/creates nothing in another month, so the target month and deadline/i)
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/new deadline/i)).not.toBeInTheDocument()
  })
})

describe("CarryForwardWizard destructive guards", () => {
  async function chooseCancel() {
    candidatesResult.data = [demand({ productCode: "PRD-001", qtyRemaining: "100" })]
    renderWizard()
    await userEvent.click(await screen.findByRole("button", { name: /carry forward/i }))
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(await screen.findByRole("option", { name: /^cancel$/i }))
  }

  it("does not label the destructive commit button with the bare word Cancel", async () => {
    // It sits beside "Back", where "Cancel" reads as the universal dismiss.
    await chooseCancel()
    expect(screen.queryByRole("button", { name: /^cancel$/i })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /cancel this demand/i })).toBeInTheDocument()
  })

  it("confirms before cancelling a demand and only submits once confirmed", async () => {
    await chooseCancel()
    await userEvent.click(screen.getByRole("button", { name: /cancel this demand/i }))

    // Nothing submitted yet — the confirmation is the gate.
    expect(processMutateAsync).not.toHaveBeenCalled()
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent(/cannot be undone/i)
    expect(dialog).toHaveTextContent("PRD-001")

    await userEvent.click(screen.getByRole("button", { name: /^cancel demand$/i }))
    await waitFor(() => expect(processMutateAsync).toHaveBeenCalledTimes(1))
    expect(processMutateAsync.mock.calls[0][0].action).toBe(CarryActionEnum.CARRY_ACTION_CANCEL)
  })

  it("blocks deferring an already-deferred demand instead of letting the backend reject it", async () => {
    // canTransition returns false when from == to (state_machine.go:52).
    candidatesResult.data = [
      demand({ status: DemandStatusEnum.DEMAND_STATUS_DEFERRED }),
    ]
    renderWizard()
    await userEvent.click(await screen.findByRole("button", { name: /carry forward/i }))
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(await screen.findByRole("option", { name: /^defer$/i }))

    expect(await screen.findByText(/already deferred/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^defer$/i })).toBeDisabled()
  })
})

describe("CarryForwardWizard session outcomes", () => {
  it("labels a deferred demand Deferred, not Carried", async () => {
    // The row survives the refetch (DEFERRED is still an eligible status), so a
    // hardcoded "Carried" badge would be a plain lie.
    candidatesResult.data = [demand({ demandId: 1, productCode: "PRD-001" })]
    processMutateAsync.mockResolvedValue({})
    renderWizard()

    await userEvent.click(await screen.findByRole("button", { name: /carry forward/i }))
    await userEvent.click(screen.getByRole("combobox"))
    await userEvent.click(await screen.findByRole("option", { name: /^defer$/i }))
    await userEvent.click(screen.getByRole("button", { name: /^defer$/i }))

    expect(await screen.findByText("Handled in this session")).toBeInTheDocument()
    expect(screen.getByText("Deferred")).toBeInTheDocument()
    expect(screen.queryByText("Carried")).not.toBeInTheDocument()
  })

  it("keeps a carried demand in the recap after the candidates refetch drops it", async () => {
    // The bug this pins: the recap used to be derived from the live candidates
    // array. Every mutation invalidates that query, and CARRY_AS_IS moves the
    // demand to CARRIED_OVER — which ListCarryCandidates does not return. So the
    // row left the array and the recap silently emptied, while "Handled just
    // now" kept counting it. DEFER was the only action that survived, which is
    // exactly why the original test suite missed this.
    candidatesResult.data = [demand({ demandId: 1, productCode: "PRD-001" })]
    processMutateAsync.mockResolvedValue({})
    const { rerender } = renderWizard()

    await userEvent.click(await screen.findByRole("button", { name: /carry forward/i }))
    await userEvent.click(screen.getByRole("button", { name: /^carry as is$/i }))
    expect(await screen.findByText("Handled in this session")).toBeInTheDocument()

    // The refetch lands: the carried demand is no longer a candidate.
    candidatesResult.data = []
    rerender(<CarryForwardWizard open onOpenChange={() => {}} />)

    // Label and outcome must both survive — they were snapshotted, not re-read.
    expect(await screen.findByText("PRD-001")).toBeInTheDocument()
    expect(screen.getByText("Carried")).toBeInTheDocument()
    // And the count above it must still agree with the list below it.
    expect(screen.getByText("Handled just now")).toBeInTheDocument()
    expect(screen.getAllByText("1").length).toBeGreaterThan(0)
  })

  it("reports the verdicts already collected when the batch loop dies part-way", async () => {
    // The hook throws BulkCarryError carrying the outcomes it had; the panel
    // must report those rather than guessing or showing nothing.
    candidatesResult.data = [
      demand({ demandId: 1, productCode: "PRD-001" }),
      demand({ demandId: 2, productCode: "PRD-002" }),
    ]
    bulkMutateAsync.mockRejectedValue(
      new BulkCarryError("connection lost", [
        { demandId: 1, label: "PRD-001", ok: true },
        { demandId: 2, label: "PRD-002", ok: false, error: "connection lost" },
      ])
    )
    renderWizard()

    await userEvent.click(await screen.findByRole("button", { name: /carry all as-is/i }))
    await userEvent.click(await screen.findByRole("button", { name: /^carry 2$/i }))

    expect(await screen.findByText(/partly done/i)).toBeInTheDocument()
    expect(screen.getByText(/connection lost/i)).toBeInTheDocument()
  })

  it("says the month is finished rather than that it never had anything", async () => {
    candidatesResult.data = [demand({ demandId: 1 })]
    processMutateAsync.mockResolvedValue({})
    renderWizard()

    await userEvent.click(await screen.findByRole("button", { name: /carry forward/i }))
    await userEvent.click(screen.getByRole("button", { name: /^carry as is$/i }))

    expect(await screen.findByText(/is handled/i)).toBeInTheDocument()
    expect(screen.queryByText(/nothing to carry from/i)).not.toBeInTheDocument()
  })
})

describe("CarryForwardWizard bulk carry", () => {
  it("names the exact count and target month in the confirmation", async () => {
    candidatesResult.data = [demand({ demandId: 1 }), demand({ demandId: 2 })]
    renderWizard()

    await userEvent.click(await screen.findByRole("button", { name: /carry all as-is \(2\)/i }))
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent("2 demands")
    // Month is spelled out, never a bare "2026-08" code.
    expect(dialog.textContent).toMatch(/[A-Z][a-z]+ \d{4}/)
  })

  it("reports a partial failure as partial and names every failed row", async () => {
    candidatesResult.data = [
      demand({ demandId: 1, productCode: "PRD-001" }),
      demand({ demandId: 2, productCode: "PRD-002" }),
    ]
    bulkMutateAsync.mockResolvedValue({
      succeeded: 1,
      failed: 1,
      outcomes: [
        { demandId: 1, label: "PRD-001", ok: true },
        { demandId: 2, label: "PRD-002", ok: false, error: "demand is not a carry candidate" },
      ],
    })
    renderWizard()

    await userEvent.click(await screen.findByRole("button", { name: /carry all as-is/i }))
    await userEvent.click(await screen.findByRole("button", { name: /^carry 2$/i }))

    await waitFor(() => expect(bulkMutateAsync).toHaveBeenCalledTimes(1))
    // Scope to the result panel: the row itself also renders "PRD-002".
    const summary = await screen.findByText(/partly done/i)
    const panel = summary.closest("div")!.parentElement!
    expect(panel).toHaveTextContent("PRD-002")
    expect(panel).toHaveTextContent(/demand is not a carry candidate/i)
    // The successful row is not silently folded into a single verdict.
    expect(summary).toHaveTextContent(/1 carried into/i)
  })

  it("never claims success when every row failed", async () => {
    candidatesResult.data = [demand({ demandId: 1, productCode: "PRD-001" })]
    bulkMutateAsync.mockResolvedValue({
      succeeded: 0,
      failed: 1,
      outcomes: [{ demandId: 1, label: "PRD-001", ok: false, error: "boom" }],
    })
    renderWizard()

    await userEvent.click(await screen.findByRole("button", { name: /carry all as-is/i }))
    await userEvent.click(await screen.findByRole("button", { name: /^carry 1$/i }))

    expect(await screen.findByText(/nothing was carried/i)).toBeInTheDocument()
  })

  it("passes human labels, not raw ids, to the batch", async () => {
    candidatesResult.data = [demand({ demandId: 42, productCode: "PRD-042" })]
    bulkMutateAsync.mockResolvedValue({ succeeded: 1, failed: 0, outcomes: [] })
    renderWizard()

    await userEvent.click(await screen.findByRole("button", { name: /carry all as-is/i }))
    await userEvent.click(await screen.findByRole("button", { name: /^carry 1$/i }))

    await waitFor(() => expect(bulkMutateAsync).toHaveBeenCalledTimes(1))
    expect(bulkMutateAsync.mock.calls[0][0].demands).toEqual([
      { demandId: 42, label: "PRD-042" },
    ])
  })
})

describe("CarryForwardWizard product linkage (regression)", () => {
  it("does not report a linked demand as unmapped when the finance label is blank", async () => {
    // cpmProductSysId is the linked-ness field. Keying off the decorated labels
    // reported every linked demand as unlinked whenever finance was unreachable.
    candidatesResult.data = [demand({ cpmProductSysId: 55, productCode: "", productName: "" })]
    renderWizard()

    await screen.findAllByRole("button", { name: /carry forward/i })
    expect(screen.queryByText(/not mapped/i)).not.toBeInTheDocument()
    expect(screen.getByText(/product name unavailable/i)).toBeInTheDocument()
  })

  it("does report a genuinely unlinked demand as not mapped", async () => {
    candidatesResult.data = [demand({ cpmProductSysId: 0, productCode: "", productName: "" })]
    renderWizard()
    expect(await screen.findByText(/not mapped/i)).toBeInTheDocument()
  })
})
