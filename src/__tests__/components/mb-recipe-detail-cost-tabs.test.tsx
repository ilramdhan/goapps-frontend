/**
 * P11 E1 — MB Cost + Traceability tabs on the MB Recipe detail page.
 *
 * These tests pin two things a snapshot would miss:
 *   1. the tab wiring itself — the triggers exist AND clicking them renders
 *      real content, so `render null` / a dropped <TabsContent> goes red;
 *   2. the absent-vs-zero discipline (D13) on `costProductId` — an absent cost
 *      product must produce an honest empty state, and must NOT be coerced with
 *      `?? 0` into a request for the nonexistent product #0.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@/__tests__/utils"
import userEvent from "@testing-library/user-event"

const mbHeadState: { costProductId: number | undefined; entryStatus: string } = {
  costProductId: undefined,
  entryStatus: "VALIDATED",
}

vi.mock("@/hooks/finance/use-mb-head", () => ({
  useMBHead: () => ({
    data: {
      data: {
        mbhId: "33333333-3333-3333-3333-333333333333",
        devCode: "DEV-1",
        shadeName: "Red",
        entryStatus: mbHeadState.entryStatus,
        currentVersion: 3,
        isBoughtout: false,
        costProductId: mbHeadState.costProductId,
        costGeneratedAt: "2026-07-01T10:00:00Z",
        costGeneratedBy: "",
      },
    },
    isLoading: false,
  }),
  // R19 Bagian B: detail-client.tsx now always mounts MBRecipeFormDialog (Edit
  // button, DRAFT-gated) alongside the existing dozing dialog, so it needs the
  // create/update mutation hooks stubbed too — same shape as
  // mb-recipe-form-dialog.test.tsx's own mock.
  useCreateMBHead: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMBHead: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

// Siblings are not under test — the MB Cost / Traceability tabs are.
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

// Spy on the shared cost hooks so we can assert exactly which productSysId the
// tabs ask for — this is what catches a `?? 0` coercion.
const historySpy = vi.fn()
const breakdownSpy = vi.fn()

vi.mock("@/hooks/finance/use-cost-calc", () => ({
  useCostHistory: (productSysId: number | undefined, params: unknown) => {
    historySpy(productSysId, params)
    if (!productSysId) return { data: undefined, isLoading: false }
    return {
      data: {
        items: [
          {
            costId: 91,
            period: "202607",
            calculationType: "ACTUAL",
            version: 2,
            costPerUnit: "1234.5",
            variancePctFromPrevious: "0",
            status: "APPROVED",
            jobId: 5,
            calculatedAt: "2026-07-01T10:00:00Z",
            calculatedBy: "",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      },
      isLoading: false,
    }
  },
  useCostBreakdown: (productSysId: number | undefined, period?: string, calcType?: string) => {
    breakdownSpy(productSysId, period, calcType)
    if (!productSysId) return { data: null, isLoading: false }
    return {
      data: {
        summary: {
          productSysId,
          productCode: "MBP-1",
          productName: "MB Product 1",
          costPerUnit: "1234.5",
          totalRmCost: "1000",
          totalConversion: "234.5",
          totalCost: "1234.5",
          currencyCode: "USD",
          version: 2,
          calculatedAt: "2026-07-01T10:00:00Z",
          calculatedBy: "",
          verifiedAt: null,
          verifiedBy: "",
        },
        paramSnapshot: { WASTE: "1.5" },
        byLevel: [],
        rmDetails: [
          {
            rmType: "CHIP",
            refCode: "RM-9",
            refLabel: "Chip A",
            shadeCode: "",
            unitCost: "10",
            ratio: "0.5",
            contribution: "500",
          },
        ],
        formulaTrace: [],
      },
      isLoading: false,
    }
  },
}))

vi.mock("@/hooks/finance/use-cost-product-parameter", () => ({
  useProductRequiredParams: () => ({ data: [] }),
}))

vi.mock("@/hooks/finance/use-mb-spin", () => ({
  useMBSpins: () => ({
    data: {
      data: [
        {
          mbsId: "s1",
          mbsMgtName: "Spin A",
          mbsMbCosting: "SP-1",
          mbsCc: "CC-1",
          mbsCostRateMkt: undefined,
          mbsRunLdrPct: 3.55,
          mbsIsActive: true,
        },
      ],
      pagination: { currentPage: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
      isSuccess: true,
      message: "",
    },
    isLoading: false,
  }),
}))

import MbRecipeDetailClient from "@/app/(dashboard)/finance/mb-recipe/[mbhId]/detail-client"

const MBH_ID = "33333333-3333-3333-3333-333333333333"

beforeEach(() => {
  historySpy.mockClear()
  breakdownSpy.mockClear()
})
afterEach(() => {
  mbHeadState.costProductId = undefined
  mbHeadState.entryStatus = "VALIDATED"
})

describe("MbRecipeDetailClient — P11 E1 tab wiring", () => {
  it("renders five tab triggers including MB Cost and Traceability", () => {
    mbHeadState.costProductId = 446
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    expect(screen.getByRole("tab", { name: "Composition" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Parameters" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "MB Cost" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Traceability" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Workflow log" })).toBeInTheDocument()
    expect(screen.getAllByRole("tab")).toHaveLength(5)
  })

  it("MB Cost tab renders the breakdown for the cost product", async () => {
    mbHeadState.costProductId = 446
    const user = userEvent.setup()
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    await user.click(screen.getByRole("tab", { name: "MB Cost" }))

    await waitFor(() => {
      expect(screen.getByTestId("mb-cost-tab")).toBeInTheDocument()
    })
    // Content, not just the container — a `render null` mutant must go red.
    expect(screen.getByTestId("mb-cost-breakdown")).toBeInTheDocument()
    expect(screen.getByText("Cost per unit")).toBeInTheDocument()
    // Same renderer as the cost-breakdown drawer → the RM row must show up.
    expect(screen.getByText("Chip A")).toBeInTheDocument()
    expect(breakdownSpy).toHaveBeenCalledWith(446, "202607", "ACTUAL")
  })

  it("Traceability tab links to the MB product and lists spins and cost rows", async () => {
    mbHeadState.costProductId = 446
    const user = userEvent.setup()
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    await user.click(screen.getByRole("tab", { name: "Traceability" }))

    await waitFor(() => {
      expect(screen.getByTestId("mb-traceability-tab")).toBeInTheDocument()
    })
    const link = screen.getByTestId("trace-cost-product-link")
    expect(link).toHaveAttribute("href", "/finance/product-master/446")
    expect(screen.getByText("Spin A")).toBeInTheDocument()
    expect(screen.getByText("202607")).toBeInTheDocument()
  })
})

describe("MbRecipeDetailClient — P11 E1 / D13 absent costProductId", () => {
  it("shows an honest empty state instead of zeros when costProductId is absent", async () => {
    mbHeadState.costProductId = undefined
    const user = userEvent.setup()
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    await user.click(screen.getByRole("tab", { name: "MB Cost" }))

    await waitFor(() => {
      expect(screen.getByTestId("mb-cost-tab-empty")).toBeInTheDocument()
    })
    expect(screen.getByText(/No MB cost generated yet/i)).toBeInTheDocument()
    expect(screen.queryByTestId("mb-cost-breakdown")).not.toBeInTheDocument()
    // The killer assertion for a `?? 0` mutant: product #0 must never be asked for.
    expect(historySpy).toHaveBeenCalled()
    for (const call of historySpy.mock.calls) expect(call[0]).toBeUndefined()
    for (const call of breakdownSpy.mock.calls) expect(call[0]).toBeUndefined()
  })

  it("treats proto3 zero as absent, not as product #0", async () => {
    mbHeadState.costProductId = 0
    const user = userEvent.setup()
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    await user.click(screen.getByRole("tab", { name: "MB Cost" }))

    await waitFor(() => {
      expect(screen.getByTestId("mb-cost-tab-empty")).toBeInTheDocument()
    })
    for (const call of historySpy.mock.calls) expect(call[0]).toBeUndefined()
  })

  it("Traceability shows no cost-product link when costProductId is absent", async () => {
    mbHeadState.costProductId = undefined
    const user = userEvent.setup()
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    await user.click(screen.getByRole("tab", { name: "Traceability" }))

    await waitFor(() => {
      expect(screen.getByTestId("trace-no-cost-product")).toBeInTheDocument()
    })
    expect(screen.queryByTestId("trace-cost-product-link")).not.toBeInTheDocument()
    // Spins still render — they do not depend on the cost product.
    expect(screen.getByText("Spin A")).toBeInTheDocument()
  })
})

/**
 * ⭐ 2026-08-26 — stale-cost warning ("gerbang mutu bagian a"). The chosen signal
 * (see the header note in mb-cost-tab.tsx) is: a cost product exists AND
 * mbHead.entryStatus !== "VALIDATED". Composition can only be edited while DRAFT
 * and cost is only ever regenerated at the VALIDATED transition, so this signal
 * never has a false negative — verified by reading mb_autogen_repository.go and
 * mb_composition_repository.go (read-only, not modified here).
 */
describe("MbRecipeDetailClient — stale MB cost warning", () => {
  it("does NOT warn on MB Cost tab when entryStatus is VALIDATED (fresh)", async () => {
    mbHeadState.costProductId = 446
    mbHeadState.entryStatus = "VALIDATED"
    const user = userEvent.setup()
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    await user.click(screen.getByRole("tab", { name: "MB Cost" }))

    await waitFor(() => {
      expect(screen.getByTestId("mb-cost-tab")).toBeInTheDocument()
    })
    expect(screen.queryByTestId("mb-cost-stale-warning")).not.toBeInTheDocument()
  })

  it("warns on MB Cost tab when the recipe has moved back to DRAFT after a cost was generated", async () => {
    mbHeadState.costProductId = 446
    mbHeadState.entryStatus = "DRAFT"
    const user = userEvent.setup()
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    await user.click(screen.getByRole("tab", { name: "MB Cost" }))

    await waitFor(() => {
      expect(screen.getByTestId("mb-cost-tab")).toBeInTheDocument()
    })
    expect(screen.getByTestId("mb-cost-stale-warning")).toBeInTheDocument()
    expect(screen.getByText(/tidak berstatus Divalidasi/i)).toBeInTheDocument()
    // The generated-at / generated-by trail must stay visible alongside the warning.
    expect(screen.getByText(/Generated/)).toBeInTheDocument()
  })

  it("does NOT warn on MB Cost tab for a non-VALIDATED status when no cost product exists yet", async () => {
    mbHeadState.costProductId = undefined
    mbHeadState.entryStatus = "DRAFT"
    const user = userEvent.setup()
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    await user.click(screen.getByRole("tab", { name: "MB Cost" }))

    await waitFor(() => {
      expect(screen.getByTestId("mb-cost-tab-empty")).toBeInTheDocument()
    })
    expect(screen.queryByTestId("mb-cost-stale-warning")).not.toBeInTheDocument()
  })

  it("warns on the Traceability tab under the same stale condition", async () => {
    mbHeadState.costProductId = 446
    mbHeadState.entryStatus = "SUBMITTED"
    const user = userEvent.setup()
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    await user.click(screen.getByRole("tab", { name: "Traceability" }))

    await waitFor(() => {
      expect(screen.getByTestId("mb-traceability-tab")).toBeInTheDocument()
    })
    expect(screen.getByTestId("mb-cost-stale-warning")).toBeInTheDocument()
  })

  it("does NOT warn on the Traceability tab when entryStatus is VALIDATED", async () => {
    mbHeadState.costProductId = 446
    mbHeadState.entryStatus = "VALIDATED"
    const user = userEvent.setup()
    render(<MbRecipeDetailClient mbhId={MBH_ID} />)

    await user.click(screen.getByRole("tab", { name: "Traceability" }))

    await waitFor(() => {
      expect(screen.getByTestId("mb-traceability-tab")).toBeInTheDocument()
    })
    expect(screen.queryByTestId("mb-cost-stale-warning")).not.toBeInTheDocument()
  })
})
