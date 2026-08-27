/**
 * USER DECISION 2026-08-26 — Revoke and Un-approve were REMOVED from MbRecipeActionBar.
 *
 * The workflow is now DRAFT (editable) → SUBMITTED (not editable) → APPROVED (locked).
 * From SUBMITTED the only actions are Approve and Reject; once locked the only action is
 * Request Unlock.
 *
 * This suite pins three things, because each is a different way the removal could regress:
 *
 *   1. neither button is rendered from ANY status, with ANY permission set — the two
 *      buttons were among the ones the bar rendered WITHOUT a permission check, so a
 *      permission-only regression test would not have caught them;
 *   2. the REVOKED and UN_APPROVED statuses still RENDER without crashing. Production
 *      holds rows in both; the statuses were deliberately ⛔ not deleted from the domain,
 *      and the UI must display such a row normally, just with no action offered;
 *   3. the legacy UN_APPROVED escape hatch survives — Approve is still offered there, so
 *      a row stranded in that status before the decision can still be moved on.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

// ─── Module mocks ─────────────────────────────────────────────────────────────

// ⚠ The mock deliberately still EXPORTS useRevokeMBHead / useUnApproveMBHead. Both hooks
// remain in the codebase — the backend RPCs still exist (removing an RPC is a breaking
// proto change) and they now refuse with a 410. What must be gone is the component's USE
// of them, so the mock offering them is the stronger test: the bar must not call them
// even when they are readily available.
const revokeMutate = vi.fn()
const unApproveMutate = vi.fn()
// 2026-08-26 Opsi A: the Validate button is gone too — same spy treatment.
const validateMutate = vi.fn()

vi.mock("@/hooks/finance/use-mb-head", () => {
  const stub = () => ({ mutate: vi.fn(), isPending: false })
  return {
    useSubmitMBHead: stub,
    useApproveMBHead: stub,
    useValidateMBHead: () => ({ mutate: validateMutate, isPending: false }),
    useUnApproveMBHead: () => ({ mutate: unApproveMutate, isPending: false }),
    useRevokeMBHead: () => ({ mutate: revokeMutate, isPending: false }),
    useRejectMBHead: stub,
    useReturnMBHeadToDraft: stub,
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

const MBH_ID = "33333333-3333-3333-3333-333333333333"

// Every permission the bar knows about. Granting ALL of them is the point: the removed
// buttons must be absent even for the most privileged user there is.
const ALL_PERMS = [
  "finance.mb.head.submit",
  "finance.mb.head.approve",
  "finance.mb.head.validate",
  "finance.mb.head.reject",
  "finance.mb.head.unapprove",
  "finance.mb.head.revoke",
  "finance.mb.recipe.unlock",
  "finance.mb.recipe.unlockrequest",
]

const ALL_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "VALIDATED",
  "UN_APPROVED",
  "REJECTED",
  "REVOKED",
  "UNLOCK_REQUESTED",
]

function renderBar(entryStatus: string, permissions: string[] = [], isBoughtout = false) {
  mockHasPermission.mockImplementation((code: string) => permissions.includes(code))
  const mbHead = { mbhId: MBH_ID, entryStatus, isBoughtout } as unknown as MBHead
  return render(<MbRecipeActionBar mbHead={mbHead} />)
}

const revokeBtn = () => screen.queryByRole("button", { name: /^revoke$/i })
const unApproveBtn = () => screen.queryByRole("button", { name: /^un-?approve$/i })
const validateBtn = () => screen.queryByRole("button", { name: /^validate$/i })

beforeEach(() => {
  mockHasPermission.mockReset()
  revokeMutate.mockReset()
  unApproveMutate.mockReset()
  validateMutate.mockReset()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MbRecipeActionBar — Revoke is removed (2026-08-26)", () => {
  it.each(ALL_STATUSES)("renders no Revoke button on %s even with every permission", (status) => {
    renderBar(status, ALL_PERMS)
    expect(revokeBtn()).not.toBeInTheDocument()
  })

  it("never calls the revoke mutation", () => {
    for (const status of ALL_STATUSES) renderBar(status, ALL_PERMS)
    expect(revokeMutate).not.toHaveBeenCalled()
  })
})

describe("MbRecipeActionBar — Un-approve is removed (2026-08-26)", () => {
  it.each(ALL_STATUSES)("renders no Un-approve button on %s even with every permission", (status) => {
    renderBar(status, ALL_PERMS)
    expect(unApproveBtn()).not.toBeInTheDocument()
  })

  it("never calls the un-approve mutation", () => {
    for (const status of ALL_STATUSES) renderBar(status, ALL_PERMS)
    expect(unApproveMutate).not.toHaveBeenCalled()
  })

  // ~~"offers only Validate and Request Unlock on APPROVED"~~
  //
  // 🔴 REWRITTEN 2026-08-26 ("Opsi A") — the Validate button was removed later the same
  // day, so the "two survivors" became one. See the Opsi A suite below for why.
  it("offers only Request Unlock on APPROVED — the sole survivor", () => {
    renderBar("APPROVED", ALL_PERMS)
    expect(screen.getByRole("button", { name: /^request unlock$/i })).toBeInTheDocument()
    expect(validateBtn()).not.toBeInTheDocument()
    expect(unApproveBtn()).not.toBeInTheDocument()
    expect(revokeBtn()).not.toBeInTheDocument()
  })
})

/**
 * USER DECISION 2026-08-26 — "OPSI A". The VALIDATE button was removed from the bar, from
 * BOTH places it appeared, and MB Produk generation moved onto Approve.
 *
 * ⚠ Validate was ⛔ NOT removed from the backend. ListValidated() filters
 * WHERE mbh_entry_status = 'VALIDATED' and feeds MB Push to Head AND Trigger MB Batch, so
 * the status must stay reachable. Pressing APPROVE now drives the backend's
 * ValidateHandler and lands the recipe straight in VALIDATED. Only the button is gone; the
 * ValidateMBHead RPC and the useValidateMBHead hook both still exist.
 *
 * The mock below therefore still EXPORTS useValidateMBHead with a spy, for the same reason
 * it still exports the revoke/un-approve hooks: the bar must not call it even though it is
 * readily available.
 */
describe("MbRecipeActionBar — Validate is removed (2026-08-26, Opsi A)", () => {
  it.each(ALL_STATUSES)("renders no Validate button on %s even with every permission", (status) => {
    renderBar(status, ALL_PERMS)
    expect(validateBtn()).not.toBeInTheDocument()
  })

  // The boughtout shortcut was the SECOND place the button lived (DRAFT + isBoughtout).
  // It is the easier one to forget, so it gets its own assertion.
  it("renders no Validate button on a boughtout DRAFT — the old shortcut is gone", () => {
    renderBar("DRAFT", ALL_PERMS, true)
    expect(validateBtn()).not.toBeInTheDocument()
    // ⛔ A boughtout recipe is NOT stranded: Submit is still offered, and Approve takes it
    // the rest of the way to VALIDATED (backend widened SUBMITTED → VALIDATED for it).
    expect(screen.getByRole("button", { name: /^submit$/i })).toBeInTheDocument()
  })

  it("never calls the validate mutation from any status", () => {
    for (const status of ALL_STATUSES) {
      renderBar(status, ALL_PERMS)
      renderBar(status, ALL_PERMS, true)
    }
    expect(validateMutate).not.toHaveBeenCalled()
  })

  // The user's simplified flow, end to end, as the bar presents it.
  it("offers Submit on DRAFT and Approve on SUBMITTED — Approve is what reaches VALIDATED", () => {
    renderBar("DRAFT", ALL_PERMS)
    expect(screen.getByRole("button", { name: /^submit$/i })).toBeInTheDocument()
    expect(validateBtn()).not.toBeInTheDocument()

    renderBar("SUBMITTED", ALL_PERMS)
    expect(screen.getByRole("button", { name: /^approve$/i })).toBeInTheDocument()
  })

  // A VALIDATED recipe is the END of the workflow: locked, with only Request Unlock.
  it("offers only Request Unlock on VALIDATED", () => {
    renderBar("VALIDATED", ALL_PERMS)
    const labels = screen.getAllByRole("button").map((b) => b.textContent?.trim())
    expect(labels).toEqual(["Request Unlock"])
  })
})

describe("MbRecipeActionBar — legacy rows in removed statuses still render", () => {
  // ⛔ The statuses were NOT deleted from the domain: production has rows in both, and a
  // detail page for one of them must not blow up. The bar returning null (no actions) is
  // the correct, non-crashing outcome for REVOKED.
  it("renders a REVOKED row without crashing and offers it no action", () => {
    const { container } = renderBar("REVOKED", ALL_PERMS)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })

  // The other half of the same decision: nothing can ENTER UN_APPROVED any more, but the
  // exit UN_APPROVED → APPROVED was deliberately kept so stranded rows can be rescued.
  it("still offers Approve on a legacy UN_APPROVED row", () => {
    renderBar("UN_APPROVED", ALL_PERMS)
    expect(screen.getByRole("button", { name: /^approve$/i })).toBeInTheDocument()
    expect(unApproveBtn()).not.toBeInTheDocument()
    expect(revokeBtn()).not.toBeInTheDocument()
  })
})

describe("MbRecipeActionBar — the surviving SUBMITTED choices", () => {
  // The user's decision stated in one assertion: from SUBMITTED there is Approve and
  // Reject, and nothing else.
  it("offers exactly Approve and Reject on SUBMITTED", () => {
    renderBar("SUBMITTED", ALL_PERMS)
    const labels = screen.getAllByRole("button").map((b) => b.textContent?.trim())
    expect(labels).toEqual(expect.arrayContaining(["Approve", "Reject"]))
    expect(labels).toHaveLength(2)
  })
})
