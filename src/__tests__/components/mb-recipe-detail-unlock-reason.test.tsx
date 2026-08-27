/**
 * P10 — the "Lock & unlock" card on the MB Recipe detail page must answer
 * WHO / WHEN / WHY, per the user decision: "tampilkan sekaligus alasan permintaan
 * di layar jadi penyetuju tahu siapa kapan dan mengapa".
 *
 * The tricky part these tests pin is the absent-vs-empty distinction:
 *   • no unlock request on record        → no "Unlock reason" row at all;
 *   • request on record, reason present  → the reason text is shown verbatim;
 *   • request on record, reason blank    → an explicit "Not recorded" placeholder,
 *     which must NOT be confused with "no request was ever made".
 * ⛔ The reason must never fall back to `stateReason` (U-2: that field points at the
 * PREVIOUS workflow step, so it would show the wrong text).
 */
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@/__tests__/utils"

type MbHeadStub = Record<string, unknown>

const mbHeadState: { value: MbHeadStub } = { value: {} }

const MBH_ID = "44444444-4444-4444-4444-444444444444"
const REQUESTER = "55555555-5555-5555-5555-555555555555"

const BASE: MbHeadStub = {
  mbhId: MBH_ID,
  devCode: "DEV-9",
  shadeName: "Blue",
  entryStatus: "UNLOCK_REQUESTED",
  currentVersion: 1,
  isBoughtout: false,
  costProductId: undefined,
}

vi.mock("@/hooks/finance/use-mb-head", () => ({
  useMBHead: () => ({ data: { data: { ...BASE, ...mbHeadState.value } }, isLoading: false }),
  // R19 Bagian B: detail-client.tsx now always mounts MBRecipeFormDialog (Edit
  // button, DRAFT-gated) alongside the Lock & unlock card under test here, so
  // it needs the create/update mutation hooks stubbed too — same shape as
  // mb-recipe-form-dialog.test.tsx's own mock.
  useCreateMBHead: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMBHead: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

// Only the Lock & unlock card is under test.
vi.mock("@/components/finance/mb-recipe/mb-composition-tab", () => ({
  MbCompositionTab: () => null,
}))
vi.mock("@/components/finance/mb-recipe/mb-parameters-tab", () => ({
  MbParametersTab: () => null,
}))
vi.mock("@/components/finance/mb-recipe/mb-workflow-log-tab", () => ({
  MbWorkflowLogTab: () => null,
}))
vi.mock("@/components/finance/mb-recipe/mb-recipe-action-bar", () => ({
  MbRecipeActionBar: () => null,
}))
vi.mock("@/components/common/user-name", () => ({
  UserName: ({ userId }: { userId: string }) => <span>user:{userId}</span>,
}))
vi.mock("@/hooks/finance/use-cost-calc", () => ({
  useCostHistory: () => ({ data: undefined, isLoading: false }),
  useCostBreakdown: () => ({ data: null, isLoading: false }),
}))
vi.mock("@/hooks/finance/use-cost-product-parameter", () => ({
  useProductRequiredParams: () => ({ data: [] }),
}))
vi.mock("@/hooks/finance/use-mb-spin", () => ({
  useMBSpins: () => ({ data: undefined, isLoading: false }),
}))

import MbRecipeDetailClient from "@/app/(dashboard)/finance/mb-recipe/[mbhId]/detail-client"

afterEach(() => {
  mbHeadState.value = {}
})

const reasonLabel = () => screen.queryByText(/^unlock reason$/i)

describe("MbRecipeDetailClient — unlock reason (P10 who/when/why)", () => {
  it("shows requester, timestamp and reason together when a request is on record", () => {
    mbHeadState.value = {
      mbhIsLocked: true,
      mbhUnlockRequestedBy: REQUESTER,
      mbhUnlockRequestedAt: "2026-08-01T09:00:00Z",
      mbhUnlockReason: "shade code salah, perlu revisi resep",
    }
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    // WHO
    expect(screen.getByText(`user:${REQUESTER}`)).toBeInTheDocument()
    // WHEN
    expect(screen.getByText(/^unlock requested at$/i)).toBeInTheDocument()
    // WHY
    expect(reasonLabel()).toBeInTheDocument()
    expect(screen.getByText("shade code salah, perlu revisi resep")).toBeInTheDocument()
  })

  it("does not render the reason row at all when there is no unlock request", () => {
    // Locked, but nobody has asked for an unlock → "no request", not "no reason".
    mbHeadState.value = { mbhIsLocked: true }
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    expect(screen.getByText(/^locked$/i)).toBeInTheDocument()
    expect(reasonLabel()).not.toBeInTheDocument()
    expect(screen.queryByText(/not recorded/i)).not.toBeInTheDocument()
  })

  it("marks the reason 'Not recorded' when a request exists but the reason is absent", () => {
    mbHeadState.value = {
      mbhIsLocked: true,
      mbhUnlockRequestedBy: REQUESTER,
      mbhUnlockRequestedAt: "2026-08-01T09:00:00Z",
      mbhUnlockReason: undefined,
    }
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    expect(reasonLabel()).toBeInTheDocument()
    expect(screen.getByText(/not recorded/i)).toBeInTheDocument()
  })

  it("treats a whitespace-only reason as not recorded rather than blank space", () => {
    mbHeadState.value = {
      mbhIsLocked: true,
      mbhUnlockRequestedBy: REQUESTER,
      mbhUnlockRequestedAt: "2026-08-01T09:00:00Z",
      mbhUnlockReason: "   ",
    }
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    expect(screen.getByText(/not recorded/i)).toBeInTheDocument()
  })

  it("never substitutes stateReason for the unlock reason (U-2)", () => {
    mbHeadState.value = {
      mbhIsLocked: true,
      mbhUnlockRequestedBy: REQUESTER,
      mbhUnlockRequestedAt: "2026-08-01T09:00:00Z",
      mbhUnlockReason: undefined,
      stateReason: "PREVIOUS STEP REASON — must not appear as the unlock reason",
    }
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    // stateReason still shows in its own field, but the unlock reason stays honest.
    expect(screen.getByText(/not recorded/i)).toBeInTheDocument()
  })
})
