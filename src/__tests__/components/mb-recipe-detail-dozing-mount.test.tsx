/**
 * P7 mount contract for the dozing calculator on the MB Recipe detail page.
 *
 * ⭐ DIPERBARUI 2026-08-26 — per keputusan user, the dozing calculator trigger
 * was removed from MB Recipe and now lives only on MB Spin (see
 * mb-spin-form-dialog.tsx / mb-dozing-calculator-dialog.test.tsx for coverage
 * of the component itself, which is unchanged). This file now pins the
 * opposite contract: the trigger must NOT be present here, so it doesn't
 * silently come back if someone re-wires detail-client.tsx.
 *
 * ~~The calculator component existed but was wired to no page at all, so these
 * tests pin the wiring itself: the trigger is present, and clicking it actually
 * opens the dialog. Without this, `open` could be hardcoded false and every
 * other test would still pass.~~
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@/__tests__/utils"

vi.mock("@/hooks/finance/use-mb-head", () => ({
  useMBHead: () => ({
    data: {
      data: {
        mbhId: "33333333-3333-3333-3333-333333333333",
        devCode: "DEV-1",
        shadeName: "Red",
        entryStatus: "DRAFT",
        currentVersion: 1,
        isBoughtout: false,
      },
    },
    isLoading: false,
  }),
  // R19 Bagian B: detail-client.tsx now always mounts MBRecipeFormDialog (Edit
  // button, DRAFT-gated) alongside the dozing dialog under test here, so it
  // needs the create/update mutation hooks stubbed too — same shape as
  // mb-recipe-form-dialog.test.tsx's own mock.
  useCreateMBHead: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMBHead: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

// The calculator is the unit under test; the sibling tabs and action bar are not.
vi.mock("@/components/finance/mb-recipe", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/components/finance/mb-recipe")
  return {
    ...actual,
    MbCompositionTab: () => null,
    MbParametersTab: () => null,
    MbWorkflowLogTab: () => null,
    MbRecipeActionBar: () => null,
  }
})

import MbRecipeDetailClient from "@/app/(dashboard)/finance/mb-recipe/[mbhId]/detail-client"

describe("MbRecipeDetailClient — dozing calculator mount", () => {
  it("does not render the dozing calculator trigger (moved to MB Spin)", () => {
    render(<MbRecipeDetailClient mbhId="33333333-3333-3333-3333-333333333333" />)
    expect(screen.queryByRole("button", { name: /Dozing calculator/i })).not.toBeInTheDocument()
  })

  it("does not mount the dozing calculator dialog", () => {
    render(<MbRecipeDetailClient mbhId="33333333-3333-3333-3333-333333333333" />)
    expect(screen.queryByTestId("dozing-calculate")).not.toBeInTheDocument()
  })
})
