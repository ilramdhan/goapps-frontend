/**
 * P10 — the unlock actions on MbRecipeActionBar.
 *
 * Pins the gates that make the unlock flow safe:
 *   1. status — "Request Unlock" only from APPROVED/VALIDATED (domain canRequestUnlock);
 *      "Grant Unlock"/"Reject Unlock" only from UNLOCK_REQUESTED (domain canGrantUnlock);
 *   2. permission — SPLIT into two codes, mirroring the backend interceptor after the user
 *      decision that a requester must not approve their own request:
 *        RequestUnlockMBHead                    → `finance.mb.recipe.unlockrequest` (ASK)
 *        GrantUnlockMBHead / RejectUnlockMBHead → `finance.mb.recipe.unlock`        (DECIDE)
 *      Holding one code must NOT reveal the other side's buttons. Holding BOTH reveals
 *      everything — that is the explicitly requested behaviour, not a bug: a decider who
 *      raised the request themselves may approve it directly. There is deliberately NO
 *      "is this my own request" identity check anywhere.
 *   3. reason contracts — request and reject-unlock demand a reason (confirm disabled while
 *      empty); grant fires straight away with NO reason, because GrantUnlockMBHeadRequest
 *      has no reason field.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// ─── Module mocks ─────────────────────────────────────────────────────────────

const requestUnlockMutate = vi.fn()
const grantUnlockMutate = vi.fn()
const rejectUnlockMutate = vi.fn()

vi.mock("@/hooks/finance/use-mb-head", () => {
  const stub = () => ({ mutate: vi.fn(), isPending: false })
  return {
    useSubmitMBHead: stub,
    useApproveMBHead: stub,
    useValidateMBHead: stub,
    useUnApproveMBHead: stub,
    useRevokeMBHead: stub,
    useRejectMBHead: stub,
    useReturnMBHeadToDraft: stub,
    useRequestUnlockMBHead: () => ({ mutate: requestUnlockMutate, isPending: false }),
    useGrantUnlockMBHead: () => ({ mutate: grantUnlockMutate, isPending: false }),
    useRejectUnlockMBHead: () => ({ mutate: rejectUnlockMutate, isPending: false }),
  }
})

// Default implementation grants nothing; renderBar() swaps in the per-test set.
const mockHasPermission = vi.fn((code: string) => [].includes(code as never))

vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: mockHasPermission }),
}))

// ─── Import under test (after all mocks are registered) ──────────────────────

import { MbRecipeActionBar } from "@/components/finance/mb-recipe/mb-recipe-action-bar"
import type { MBHead } from "@/types/finance/mb-head"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MBH_ID = "11111111-1111-1111-1111-111111111111"
// DECIDE code — grant/reject. Legacy code, new meaning.
const UNLOCK_PERM = "finance.mb.recipe.unlock"
// ASK code — request only. ⚠ ONE segment: `unlockrequest`, no dot, no underscore.
const UNLOCK_REQUEST_PERM = "finance.mb.recipe.unlockrequest"

function renderBar(entryStatus: string, permissions: string[] = []) {
  mockHasPermission.mockImplementation((code: string) => permissions.includes(code))
  const mbHead = { mbhId: MBH_ID, entryStatus, isBoughtout: false } as unknown as MBHead
  return render(<MbRecipeActionBar mbHead={mbHead} />)
}

const requestBtn = () => screen.queryByRole("button", { name: /^request unlock$/i })
const grantBtn = () => screen.queryByRole("button", { name: /^grant unlock$/i })
const rejectBtn = () => screen.queryByRole("button", { name: /^reject unlock$/i })

beforeEach(() => {
  mockHasPermission.mockReset()
  requestUnlockMutate.mockReset()
  grantUnlockMutate.mockReset()
  rejectUnlockMutate.mockReset()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MbRecipeActionBar — Request Unlock gates (P10)", () => {
  it.each(["APPROVED", "VALIDATED"])(
    "shows Request Unlock on %s with the ASK permission",
    (status) => {
      renderBar(status, [UNLOCK_REQUEST_PERM])
      expect(requestBtn()).toBeInTheDocument()
    },
  )

  it.each(["APPROVED", "VALIDATED"])("hides Request Unlock on %s without any permission", (status) => {
    renderBar(status, [])
    expect(requestBtn()).not.toBeInTheDocument()
  })

  it.each(["APPROVED", "VALIDATED"])(
    "hides Request Unlock on %s for a holder of ONLY the DECIDE permission",
    (status) => {
      // The codes are not interchangeable: `finance.mb.recipe.unlock` decides, it does not ask.
      renderBar(status, [UNLOCK_PERM])
      expect(requestBtn()).not.toBeInTheDocument()
    },
  )

  it.each(["DRAFT", "SUBMITTED", "UN_APPROVED", "REVOKED", "REJECTED", "UNLOCK_REQUESTED"])(
    "hides Request Unlock on %s even with the ASK permission",
    (status) => {
      renderBar(status, [UNLOCK_REQUEST_PERM])
      expect(requestBtn()).not.toBeInTheDocument()
    },
  )
})

describe("MbRecipeActionBar — Grant/Reject Unlock gates (P10)", () => {
  it("shows both decision buttons on UNLOCK_REQUESTED with the DECIDE permission", () => {
    renderBar("UNLOCK_REQUESTED", [UNLOCK_PERM])
    expect(grantBtn()).toBeInTheDocument()
    expect(rejectBtn()).toBeInTheDocument()
  })

  it("hides both decision buttons on UNLOCK_REQUESTED without any permission", () => {
    renderBar("UNLOCK_REQUESTED", [])
    expect(grantBtn()).not.toBeInTheDocument()
    expect(rejectBtn()).not.toBeInTheDocument()
  })

  it("hides both decision buttons for a holder of ONLY the ASK permission", () => {
    // This is the whole point of the split: whoever may only ASK must not be able to DECIDE.
    renderBar("UNLOCK_REQUESTED", [UNLOCK_REQUEST_PERM])
    expect(grantBtn()).not.toBeInTheDocument()
    expect(rejectBtn()).not.toBeInTheDocument()
  })

  it.each(["DRAFT", "SUBMITTED", "APPROVED", "VALIDATED", "UN_APPROVED", "REJECTED", "REVOKED"])(
    "hides both decision buttons on %s even with the DECIDE permission",
    (status) => {
      renderBar(status, [UNLOCK_PERM])
      expect(grantBtn()).not.toBeInTheDocument()
      expect(rejectBtn()).not.toBeInTheDocument()
    },
  )

  it("does not offer the plain workflow Reject on UNLOCK_REQUESTED", () => {
    // Guards against the two Reject actions being confused: /reject applies to a
    // SUBMITTED head, /reject-unlock to a parked unlock request.
    renderBar("UNLOCK_REQUESTED", [UNLOCK_PERM, "finance.mb.head.reject"])
    expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument()
  })
})

describe("MbRecipeActionBar — unlock reason contracts (P10)", () => {
  it("keeps Request Unlock confirm disabled while the reason is empty", async () => {
    const user = userEvent.setup()
    renderBar("APPROVED", [UNLOCK_REQUEST_PERM])

    await user.click(requestBtn()!)
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent(/request unlock/i)

    const confirm = screen.getAllByRole("button", { name: /^request unlock$/i }).at(-1)!
    expect(confirm).toBeDisabled()
    expect(requestUnlockMutate).not.toHaveBeenCalled()
  })

  it("fires Request Unlock with the trimmed reason", async () => {
    const user = userEvent.setup()
    renderBar("VALIDATED", [UNLOCK_REQUEST_PERM])

    await user.click(requestBtn()!)
    await screen.findByRole("dialog")
    await user.type(screen.getByLabelText(/reason/i), "  wrong shade  ")

    const confirm = screen.getAllByRole("button", { name: /^request unlock$/i }).at(-1)!
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    expect(requestUnlockMutate).toHaveBeenCalledTimes(1)
    expect(requestUnlockMutate.mock.calls[0][0]).toEqual({ mbhId: MBH_ID, reason: "wrong shade" })
  })

  it("keeps Reject Unlock confirm disabled on a whitespace-only reason", async () => {
    const user = userEvent.setup()
    renderBar("UNLOCK_REQUESTED", [UNLOCK_PERM])

    await user.click(rejectBtn()!)
    await screen.findByRole("dialog")
    await user.type(screen.getByLabelText(/reason/i), "   ")

    const confirm = screen.getAllByRole("button", { name: /^reject unlock$/i }).at(-1)!
    expect(confirm).toBeDisabled()
    expect(rejectUnlockMutate).not.toHaveBeenCalled()
  })

  it("fires Reject Unlock with the trimmed reason", async () => {
    const user = userEvent.setup()
    renderBar("UNLOCK_REQUESTED", [UNLOCK_PERM])

    await user.click(rejectBtn()!)
    await screen.findByRole("dialog")
    await user.type(screen.getByLabelText(/reason/i), "  not justified  ")

    const confirm = screen.getAllByRole("button", { name: /^reject unlock$/i }).at(-1)!
    await user.click(confirm)

    expect(rejectUnlockMutate).toHaveBeenCalledTimes(1)
    expect(rejectUnlockMutate.mock.calls[0][0]).toEqual({ mbhId: MBH_ID, reason: "not justified" })
  })

  it("fires Grant Unlock immediately with the bare id and no reason dialog", async () => {
    const user = userEvent.setup()
    renderBar("UNLOCK_REQUESTED", [UNLOCK_PERM])

    await user.click(grantBtn()!)

    // ⛔ No dialog: granting is an assent and carries no reason field.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(grantUnlockMutate).toHaveBeenCalledTimes(1)
    expect(grantUnlockMutate.mock.calls[0][0]).toBe(MBH_ID)
  })
})

describe("MbRecipeActionBar — holding BOTH unlock codes (user decision)", () => {
  // ⚠ Intentional, not a bug. The user asked for exactly this: a holder of the unlock
  // (DECIDE) permission who raised the request themselves may approve it directly.
  // There is deliberately no self-request/identity comparison in the component.
  it.each(["APPROVED", "VALIDATED"])(
    "shows Request Unlock on %s to a holder of both codes",
    (status) => {
      renderBar(status, [UNLOCK_REQUEST_PERM, UNLOCK_PERM])
      expect(requestBtn()).toBeInTheDocument()
    },
  )

  it("shows Grant and Reject Unlock on UNLOCK_REQUESTED to a holder of both codes", () => {
    renderBar("UNLOCK_REQUESTED", [UNLOCK_REQUEST_PERM, UNLOCK_PERM])
    expect(grantBtn()).toBeInTheDocument()
    expect(rejectBtn()).toBeInTheDocument()
  })

  it("lets a both-code holder grant straight away — no self-request block", async () => {
    const user = userEvent.setup()
    renderBar("UNLOCK_REQUESTED", [UNLOCK_REQUEST_PERM, UNLOCK_PERM])

    await user.click(grantBtn()!)

    expect(grantUnlockMutate).toHaveBeenCalledTimes(1)
    expect(grantUnlockMutate.mock.calls[0][0]).toBe(MBH_ID)
  })
})
