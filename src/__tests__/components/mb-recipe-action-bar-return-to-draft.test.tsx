/**
 * K-29 / K-30 — the "Return to Draft" action on MbRecipeActionBar (REJECTED → DRAFT).
 *
 * Pins three decisions:
 *   1. K-30 (option A) — the button is gated on `finance.mb.head.submit`, NOT on
 *      `finance.mb.head.reject` and not on any new permission code;
 *   2. status — it is offered ONLY from REJECTED;
 *   3. K-29 — the reason is OPTIONAL: the confirm button is NOT disabled on an empty
 *      box, and confirming submits an empty string (backend keeps the old stateReason).
 * ~~Plus K-24: Revoke must still be available on REJECTED.~~
 *
 * 🔴 2026-08-26 (USER DECISION) — Revoke was REMOVED from the workflow, so that last
 * clause is void. K-24's real claim (REJECTED is not a dead end) is now demonstrated by
 * Return to Draft itself, which this suite already covers end to end.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// ─── Module mocks ─────────────────────────────────────────────────────────────

const returnToDraftMutate = vi.fn()

vi.mock("@/hooks/finance/use-mb-head", () => {
  const stub = () => ({ mutate: vi.fn(), isPending: false })
  return {
    useSubmitMBHead:        stub,
    useApproveMBHead:       stub,
    useValidateMBHead:      stub,
    useUnApproveMBHead:     stub,
    useRevokeMBHead:        stub,
    useRejectMBHead:        stub,
    useReturnMBHeadToDraft: () => ({ mutate: returnToDraftMutate, isPending: false }),
    useUnrevokeMBHead: stub,
    // P10 unlock hooks are rendered by the same bar; stub them so this suite keeps
    // exercising only its own path.
    useRequestUnlockMBHead: stub,
    useGrantUnlockMBHead: stub,
    useRejectUnlockMBHead: stub,
  }
})

const mockHasPermission = vi.fn<(code: string) => boolean>(() => false)

vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: mockHasPermission }),
}))

// ─── Import under test (after all mocks are registered) ──────────────────────

import { MbRecipeActionBar } from "@/components/finance/mb-recipe/mb-recipe-action-bar"
import type { MBHead } from "@/types/finance/mb-head"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseMbHead(entryStatus: string): MBHead {
  return {
    mbhId: "22222222-2222-2222-2222-222222222222",
    entryStatus,
    isBoughtout: false,
  } as unknown as MBHead
}

function renderBar(entryStatus: string, permissions: string[] = []) {
  mockHasPermission.mockImplementation((code: string) => permissions.includes(code))
  return render(<MbRecipeActionBar mbHead={baseMbHead(entryStatus)} />)
}

const SUBMIT_PERM = "finance.mb.head.submit"
const REJECT_PERM = "finance.mb.head.reject"
const RETURN_BTN = /^return to draft$/i

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MbRecipeActionBar — Return to Draft permission gate (K-30 option A)", () => {
  beforeEach(() => {
    mockHasPermission.mockReset()
    returnToDraftMutate.mockReset()
  })

  it("shows Return to Draft on REJECTED when the user holds finance.mb.head.submit", () => {
    renderBar("REJECTED", [SUBMIT_PERM])
    expect(screen.getByRole("button", { name: RETURN_BTN })).toBeInTheDocument()
  })

  it("hides Return to Draft on REJECTED when the user holds no permissions", () => {
    renderBar("REJECTED", [])
    expect(screen.queryByRole("button", { name: RETURN_BTN })).not.toBeInTheDocument()
  })

  it("hides Return to Draft when the user only holds finance.mb.head.reject", () => {
    renderBar("REJECTED", [REJECT_PERM])
    expect(screen.queryByRole("button", { name: RETURN_BTN })).not.toBeInTheDocument()
  })
})

describe("MbRecipeActionBar — Return to Draft status gate (K-29)", () => {
  beforeEach(() => {
    mockHasPermission.mockReset()
    returnToDraftMutate.mockReset()
  })

  it.each(["DRAFT", "SUBMITTED", "APPROVED", "VALIDATED", "UN_APPROVED", "REVOKED"])(
    "hides Return to Draft on %s even with finance.mb.head.submit",
    (status) => {
      renderBar(status, [SUBMIT_PERM, REJECT_PERM])
      expect(screen.queryByRole("button", { name: RETURN_BTN })).not.toBeInTheDocument()
    },
  )

  // ~~keeps Revoke available on REJECTED (K-24: REJECTED is not terminal)~~
  //
  // 🔴 REWRITTEN 2026-08-26 — Revoke is gone. REJECTED is still ⛔ not a dead end, and
  // that is asserted here directly: Return to Draft is the surviving way out.
  it("offers Return to Draft but no Revoke on REJECTED (Revoke removed 2026-08-26)", () => {
    renderBar("REJECTED", [SUBMIT_PERM])
    expect(screen.getByRole("button", { name: RETURN_BTN })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^revoke$/i })).not.toBeInTheDocument()
  })
})

describe("MbRecipeActionBar — Return to Draft reason is optional (K-29)", () => {
  beforeEach(() => {
    mockHasPermission.mockReset()
    returnToDraftMutate.mockReset()
  })

  it("keeps the confirm button ENABLED while the reason box is empty", async () => {
    const user = userEvent.setup()
    renderBar("REJECTED", [SUBMIT_PERM])

    await user.click(screen.getByRole("button", { name: RETURN_BTN }))

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent(/return mb head to draft/i)

    const confirm = screen.getAllByRole("button", { name: RETURN_BTN }).at(-1)!
    expect(confirm).toBeEnabled()
  })

  it("labels the reason field as optional", async () => {
    const user = userEvent.setup()
    renderBar("REJECTED", [SUBMIT_PERM])

    await user.click(screen.getByRole("button", { name: RETURN_BTN }))
    await screen.findByRole("dialog")

    expect(screen.getByLabelText(/reason \(optional\)/i)).toBeInTheDocument()
  })

  it("fires the mutation with an EMPTY string when no reason is typed", async () => {
    const user = userEvent.setup()
    renderBar("REJECTED", [SUBMIT_PERM])

    await user.click(screen.getByRole("button", { name: RETURN_BTN }))
    await screen.findByRole("dialog")

    const confirm = screen.getAllByRole("button", { name: RETURN_BTN }).at(-1)!
    await user.click(confirm)

    expect(returnToDraftMutate).toHaveBeenCalledTimes(1)
    expect(returnToDraftMutate.mock.calls[0][0]).toEqual({
      mbhId: "22222222-2222-2222-2222-222222222222",
      reason: "",
    })
  })

  it("fires the mutation with the trimmed reason when one is typed", async () => {
    const user = userEvent.setup()
    renderBar("REJECTED", [SUBMIT_PERM])

    await user.click(screen.getByRole("button", { name: RETURN_BTN }))
    await screen.findByRole("dialog")

    await user.type(screen.getByLabelText(/reason/i), "  fixing the dosing  ")

    const confirm = screen.getAllByRole("button", { name: RETURN_BTN }).at(-1)!
    await user.click(confirm)

    expect(returnToDraftMutate).toHaveBeenCalledTimes(1)
    expect(returnToDraftMutate.mock.calls[0][0]).toEqual({
      mbhId: "22222222-2222-2222-2222-222222222222",
      reason: "fixing the dosing",
    })
  })
})
