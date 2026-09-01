/**
 * R22 — MbRecipeActionBar blocks Submit in the UI when the composition's
 * non-carrier total (computed by the parent, MbRecipeDetailClient, and passed
 * down as `compositionTotalPct`) exceeds 100%, and shows a clear
 * business-language warning.
 *
 * This is a UI-side early warning only — it does NOT change or duplicate the
 * backend's [G.5] EnforceHeadSum rule (which requires the total to equal 100%
 * within tolerance, and is enforced server-side behind MB_COMPOSITION_SUM_ENFORCED).
 * See src/lib/finance/mb-composition-total.ts for the shared helper this gate uses.
 *
 * The bar itself does not fetch compositions (no useMbCompositions call) so it
 * stays a plain prop-driven component — this suite exercises it without any
 * TanStack Query provider, same as its sibling action-bar test files.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

// ─── Module mocks ─────────────────────────────────────────────────────────────

const submitMutate = vi.fn()

vi.mock("@/hooks/finance/use-mb-head", () => {
  const stub = () => ({ mutate: vi.fn(), isPending: false })
  return {
    useSubmitMBHead: () => ({ mutate: submitMutate, isPending: false }),
    useApproveMBHead: stub,
    useValidateMBHead: stub,
    useUnApproveMBHead: stub,
    useRevokeMBHead: stub,
    useRejectMBHead: stub,
    useReturnMBHeadToDraft: stub,
    useUnrevokeMBHead: stub,
    useRequestUnlockMBHead: stub,
    useGrantUnlockMBHead: stub,
    useRejectUnlockMBHead: stub,
  }
})

vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: () => true }),
}))

// ─── Import under test (after all mocks are registered) ──────────────────────

import { MbRecipeActionBar } from "@/components/finance/mb-recipe/mb-recipe-action-bar"
import type { MBHead } from "@/types/finance/mb-head"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function draftMbHead(): MBHead {
  return {
    mbhId: "33333333-3333-3333-3333-333333333333",
    entryStatus: "DRAFT",
    isBoughtout: false,
  } as unknown as MBHead
}

const SUBMIT_BTN = /^submit$/i

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MbRecipeActionBar — composition total submit gate (R22)", () => {
  beforeEach(() => {
    submitMutate.mockReset()
  })

  it("keeps Submit enabled when compositionTotalPct is omitted (unaffected callers)", () => {
    render(<MbRecipeActionBar mbHead={draftMbHead()} />)
    expect(screen.getByRole("button", { name: SUBMIT_BTN })).toBeEnabled()
  })

  it("keeps Submit enabled when the total is exactly 100%", () => {
    render(<MbRecipeActionBar mbHead={draftMbHead()} compositionTotalPct={100} />)

    expect(screen.getByRole("button", { name: SUBMIT_BTN })).toBeEnabled()
    expect(screen.queryByText(/exceeds 100%/i)).not.toBeInTheDocument()
  })

  it("keeps Submit enabled when the total is under 100%", () => {
    render(<MbRecipeActionBar mbHead={draftMbHead()} compositionTotalPct={60} />)
    expect(screen.getByRole("button", { name: SUBMIT_BTN })).toBeEnabled()
  })

  it("disables Submit and shows a warning when the total exceeds 100%", () => {
    render(<MbRecipeActionBar mbHead={draftMbHead()} compositionTotalPct={105} />)

    expect(screen.getByRole("button", { name: SUBMIT_BTN })).toBeDisabled()
    expect(screen.getByText(/exceeds 100%/i)).toBeInTheDocument()
    expect(screen.getByText(/105\.000%/)).toBeInTheDocument()
  })

  it("does not block Approve or other actions on non-DRAFT statuses regardless of total", () => {
    const mbHead = { ...draftMbHead(), entryStatus: "SUBMITTED" } as MBHead
    render(<MbRecipeActionBar mbHead={mbHead} compositionTotalPct={999} />)

    expect(screen.queryByRole("button", { name: SUBMIT_BTN })).not.toBeInTheDocument()
    expect(screen.queryByText(/exceeds 100%/i)).not.toBeInTheDocument()
  })

  it("clicking Submit while enabled still fires the mutation", () => {
    render(<MbRecipeActionBar mbHead={draftMbHead()} compositionTotalPct={100} />)

    screen.getByRole("button", { name: SUBMIT_BTN }).click()
    expect(submitMutate).toHaveBeenCalledWith("33333333-3333-3333-3333-333333333333")
  })
})
