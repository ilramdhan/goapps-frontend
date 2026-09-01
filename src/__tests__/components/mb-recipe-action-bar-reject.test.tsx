/**
 * K-2 / K-25 — the Reject action on MbRecipeActionBar.
 *
 * Pins the two gates that make Reject safe:
 *   1. status — Reject is offered ONLY from SUBMITTED;
 *   2. permission — Reject requires `finance.mb.head.reject`, even on SUBMITTED.
 * Plus the K-2 "reason is mandatory" contract: the dialog's confirm button
 * stays disabled while the reason box is empty, and no mutation fires.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// ─── Module mocks ─────────────────────────────────────────────────────────────

const rejectMutate = vi.fn()

vi.mock("@/hooks/finance/use-mb-head", () => {
  const stub = () => ({ mutate: vi.fn(), isPending: false })
  return {
    useSubmitMBHead:    stub,
    useApproveMBHead:   stub,
    useValidateMBHead:  stub,
    useUnApproveMBHead: stub,
    useRevokeMBHead:    stub,
    useRejectMBHead:    () => ({ mutate: rejectMutate, isPending: false }),
    // Return-to-Draft (K-29) is rendered by the same bar; stub it so this suite
    // keeps exercising only the Reject path.
    useReturnMBHeadToDraft: stub,
    useUnrevokeMBHead: stub,
    // P10 unlock hooks are rendered by the same bar; stub them so this suite keeps
    // exercising only its own path.
    useRequestUnlockMBHead: stub,
    useGrantUnlockMBHead: stub,
    useRejectUnlockMBHead: stub,
  }
})

const mockHasPermission = vi.fn((_code: string) => false)

vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: mockHasPermission }),
}))

// ─── Import under test (after all mocks are registered) ──────────────────────

import { MbRecipeActionBar } from "@/components/finance/mb-recipe/mb-recipe-action-bar"
import type { MBHead } from "@/types/finance/mb-head"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseMbHead(entryStatus: string): MBHead {
  return {
    mbhId: "11111111-1111-1111-1111-111111111111",
    entryStatus,
    isBoughtout: false,
  } as unknown as MBHead
}

function renderBar(entryStatus: string, permissions: string[] = []) {
  mockHasPermission.mockImplementation((code: string) => permissions.includes(code))
  return render(<MbRecipeActionBar mbHead={baseMbHead(entryStatus)} />)
}

const REJECT_PERM = "finance.mb.head.reject"

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MbRecipeActionBar — Reject permission gate (K-25)", () => {
  beforeEach(() => {
    mockHasPermission.mockReset()
    rejectMutate.mockReset()
  })

  it("shows Reject on SUBMITTED when the user holds finance.mb.head.reject", () => {
    renderBar("SUBMITTED", [REJECT_PERM])
    expect(screen.getByRole("button", { name: /^reject$/i })).toBeInTheDocument()
  })

  it("hides Reject on SUBMITTED when the user lacks finance.mb.head.reject", () => {
    renderBar("SUBMITTED", [])
    expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument()
  })

  it("still renders the rest of the action bar when Reject is hidden", () => {
    renderBar("SUBMITTED", [])
    expect(screen.getByRole("button", { name: /^approve$/i })).toBeInTheDocument()
    // ~~expect(screen.getByRole("button", { name: /^revoke$/i })).toBeInTheDocument()~~
    // 🔴 2026-08-26 (USER DECISION) — Revoke was removed from the bar. Approve is now the
    // only other action on SUBMITTED, which is exactly what the simplified workflow says:
    // from SUBMITTED there is Approve and Reject, nothing else.
    expect(screen.queryByRole("button", { name: /^revoke$/i })).not.toBeInTheDocument()
  })
})

describe("MbRecipeActionBar — Reject status gate (K-2)", () => {
  beforeEach(() => {
    mockHasPermission.mockReset()
    rejectMutate.mockReset()
  })

  it.each(["DRAFT", "APPROVED", "VALIDATED", "UN_APPROVED", "REVOKED", "REJECTED"])(
    "hides Reject on %s even with the permission",
    (status) => {
      renderBar(status, [REJECT_PERM])
      expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument()
    },
  )

  // ~~keeps Revoke available on REJECTED (K-24: REJECTED is not terminal)~~
  //
  // 🔴 REWRITTEN 2026-08-26 (USER DECISION) — Revoke was removed entirely, so it is no
  // longer offered on REJECTED either. K-24's underlying point (REJECTED is not a dead
  // end) still holds and is covered by the Return-to-Draft suite; only the escape route
  // this test used has gone.
  it("no longer offers Revoke on REJECTED (removed 2026-08-26)", () => {
    renderBar("REJECTED", [REJECT_PERM])
    expect(screen.queryByRole("button", { name: /^revoke$/i })).not.toBeInTheDocument()
  })
})

describe("MbRecipeActionBar — Reject reason is mandatory (K-2)", () => {
  beforeEach(() => {
    mockHasPermission.mockReset()
    rejectMutate.mockReset()
  })

  it("opens the reason dialog and keeps confirm disabled while the reason is empty", async () => {
    const user = userEvent.setup()
    renderBar("SUBMITTED", [REJECT_PERM])

    await user.click(screen.getByRole("button", { name: /^reject$/i }))

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent(/reject mb head/i)

    const confirm = screen.getAllByRole("button", { name: /^reject$/i }).at(-1)!
    expect(confirm).toBeDisabled()
    expect(rejectMutate).not.toHaveBeenCalled()
  })

  it("does not fire the mutation when the reason is whitespace only", async () => {
    const user = userEvent.setup()
    renderBar("SUBMITTED", [REJECT_PERM])

    await user.click(screen.getByRole("button", { name: /^reject$/i }))
    await screen.findByRole("dialog")

    await user.type(screen.getByLabelText(/reason/i), "   ")

    const confirm = screen.getAllByRole("button", { name: /^reject$/i }).at(-1)!
    expect(confirm).toBeDisabled()
    expect(rejectMutate).not.toHaveBeenCalled()
  })

  it("fires the reject mutation with the trimmed reason once one is typed", async () => {
    const user = userEvent.setup()
    renderBar("SUBMITTED", [REJECT_PERM])

    await user.click(screen.getByRole("button", { name: /^reject$/i }))
    await screen.findByRole("dialog")

    await user.type(screen.getByLabelText(/reason/i), "  wrong dozing  ")

    const confirm = screen.getAllByRole("button", { name: /^reject$/i }).at(-1)!
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    expect(rejectMutate).toHaveBeenCalledTimes(1)
    expect(rejectMutate.mock.calls[0][0]).toEqual({
      mbhId: "11111111-1111-1111-1111-111111111111",
      reason: "wrong dozing",
    })
  })
})
