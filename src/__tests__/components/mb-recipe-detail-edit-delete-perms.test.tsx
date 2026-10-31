/**
 * Edit / Delete on the MB Recipe detail page: both are DRAFT-only (the backend
 * DeleteHandler rejects non-DRAFT with ErrNotDeletable) and gated on the RPC codes
 * finance.mb.head.update / finance.mb.head.delete.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/__tests__/utils"

const state: { entryStatus: string; permissions: string[] } = { entryStatus: "DRAFT", permissions: [] }

vi.mock("@/components/finance/mb-head", () => ({
  MBHeadDeleteDialog: () => null,
}))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}))
vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: (code: string) => state.permissions.includes(code) }),
}))
vi.mock("@/hooks/finance/use-mb-head", () => ({
  useMBHead: () => ({
    data: {
      data: {
        mbhId: "33333333-3333-3333-3333-333333333333",
        devCode: "DEV-1",
        shadeName: "Red",
        entryStatus: state.entryStatus,
        currentVersion: 1,
        isBoughtout: false,
      },
    },
    isLoading: false,
  }),
  useCreateMBHead: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMBHead: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock("@/components/finance/mb-recipe", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/components/finance/mb-recipe")
  return {
    ...actual,
    MbCompositionTab: () => null,
    MbParametersTab: () => null,
    MbWorkflowLogTab: () => null,
    MbRecipeActionBar: () => null,
    MbCostTab: () => null,
    MbTraceabilityTab: () => null,
  }
})
vi.mock("@/hooks/finance/use-mb-composition", () => ({
  useMbCompositions: () => ({ data: [] }),
}))

import MbRecipeDetailClient from "@/app/(dashboard)/finance/mb-recipe/[mbhId]/detail-client"

const UPDATE = "finance.mb.head.update"
const DELETE = "finance.mb.head.delete"

function renderDetail() {
  render(<MbRecipeDetailClient mbhId="33333333-3333-3333-3333-333333333333" />)
}

describe("MbRecipeDetailClient — Edit / Delete gates", () => {
  beforeEach(() => {
    state.entryStatus = "DRAFT"
    state.permissions = []
  })

  it("shows Edit and Delete on DRAFT for holders of update + delete", () => {
    state.permissions = [UPDATE, DELETE]
    renderDetail()
    expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument()
  })

  it("hides both on DRAFT without the permissions (approver / validator)", () => {
    renderDetail()
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument()
  })

  it.each(["SUBMITTED", "APPROVED", "VALIDATED", "REJECTED", "UNLOCK_REQUESTED"])(
    "hides both on %s even with the permissions",
    (status) => {
      state.entryStatus = status
      state.permissions = [UPDATE, DELETE]
      renderDetail()
      expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument()
    },
  )
})
