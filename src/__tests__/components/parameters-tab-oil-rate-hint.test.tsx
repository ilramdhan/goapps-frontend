/**
 * ProductParametersTab — OIL_RATE hint rendering (oil-cost-rm-group P5-T4, D14).
 *
 * OIL_RATE is a fill-group child of OIL_NAME, but its stored numeric value is
 * stale by design: the calc engine resolves the real rate per calc period
 * (CR -> SR -> PR cascade). Rendering the last-saved number here would look
 * live when it isn't, so the row must show an explanatory hint instead of any
 * number, while every other lookup-fill-group child still shows its stored
 * value as before (no regression).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen } from "@testing-library/react"
import { render } from "../utils"
import type { RequiredParamEntry } from "@/types/finance/cost-product-parameter"

vi.mock("@/hooks/finance/use-cost-product-parameter", () => ({
  useProductRequiredParams: vi.fn(),
  useMissingRequiredParams: () => ({ data: [] }),
  useUpsertProductParamValuesBatch: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveApplicableParam: () => ({ mutate: vi.fn(), isPending: false }),
  useAvailableParams: () => ({ data: [], isLoading: false }),
}))
vi.mock("@/hooks/finance/use-mb-param", () => ({
  useMbParams: () => ({ data: { items: [] }, isLoading: false }),
}))
vi.mock("@/hooks/finance/use-master-lookup", () => ({
  useMasterLookupOptions: () => ({ data: [], isLoading: false }),
  useMasterLookupResolveValue: () => ({ data: [], isLoading: false }),
}))

import { useProductRequiredParams } from "@/hooks/finance/use-cost-product-parameter"
import { ProductParametersTab } from "@/components/finance/cost-product-master/parameters-tab"

function baseEntry(overrides: Partial<RequiredParamEntry>): RequiredParamEntry {
  return {
    paramId: overrides.paramId ?? "p",
    paramCode: overrides.paramCode ?? "X",
    paramName: overrides.paramName ?? overrides.paramCode ?? "X",
    paramShortName: "",
    dataType: "NUMBER",
    paramCategory: "MASTER_LOOKUP",
    uomCode: "",
    ownerDepartment: "",
    isRequiredForCosting: false,
    lookupMasterCode: "",
    lookupFillGroupCode: "",
    lookupSourceColumn: "",
    displayOrder: 1,
    displayGroup: "Oil",
    valueMbSpinId: "",
    mbSpinCandidateCount: 0,
    hasMbSpinCandidateCount: false,
    mbSpinCandidates: [],
    hasValue: true,
    valueNumeric: "",
    valueText: "",
    valueFlag: false,
    filledAt: "",
    filledBy: "",
    displayValue: "",
    ...overrides,
  }
}

const OIL_NAME_ENTRY = baseEntry({
  paramId: "p-oil-name",
  paramCode: "OIL_NAME",
  paramName: "Oil Name",
  paramCategory: "MASTER_LOOKUP",
  lookupMasterCode: "RM_GROUP_OIL",
  valueText: "OIL GROUP A",
})

const OIL_RATE_ENTRY = baseEntry({
  paramId: "p-oil-rate",
  paramCode: "OIL_RATE",
  paramName: "Oil Rate",
  paramCategory: "REQUIRED",
  lookupFillGroupCode: "OIL_NAME",
  // Stale stored number — must NEVER be shown to the user (D14).
  valueNumeric: "0.0345",
})

const OTHER_CHILD_ENTRY = baseEntry({
  paramId: "p-other-child",
  paramCode: "SOME_OTHER_CHILD",
  paramName: "Some Other Child",
  paramCategory: "REQUIRED",
  lookupFillGroupCode: "OIL_NAME",
  valueNumeric: "12.5",
})

describe("ProductParametersTab — OIL_RATE renders a hint, never the stored number", () => {
  beforeEach(() => {
    vi.mocked(useProductRequiredParams).mockReset()
  })

  it("shows the follow-the-RM-group hint with the OIL_NAME value, not a number", () => {
    vi.mocked(useProductRequiredParams).mockReturnValue({
      data: [OIL_NAME_ENTRY, OIL_RATE_ENTRY],
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    render(<ProductParametersTab productSysId={1} />)

    expect(screen.getByText(/Follows RM group/i)).toBeInTheDocument()
    expect(screen.getByText("OIL GROUP A")).toBeInTheDocument()
    expect(screen.getByText(/CR→SR→PR/i)).toBeInTheDocument()
    // The stale stored number must never render anywhere on the page.
    expect(screen.queryByText("0.0345")).not.toBeInTheDocument()
  })

  it("falls back to an explicit not-set hint when OIL_NAME has no value yet", () => {
    const unsetOilName = { ...OIL_NAME_ENTRY, valueText: "", hasValue: false }
    vi.mocked(useProductRequiredParams).mockReturnValue({
      data: [unsetOilName, OIL_RATE_ENTRY],
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    render(<ProductParametersTab productSysId={1} />)

    expect(screen.getByText(/OIL_NAME not set/i)).toBeInTheDocument()
    expect(screen.queryByText("0.0345")).not.toBeInTheDocument()
  })

  it("still shows the stored value for a non-OIL_RATE fill-group child (no regression)", () => {
    vi.mocked(useProductRequiredParams).mockReturnValue({
      data: [OIL_NAME_ENTRY, OTHER_CHILD_ENTRY],
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    render(<ProductParametersTab productSysId={1} />)

    expect(screen.getByText("12.5")).toBeInTheDocument()
  })
})

describe("ProductParametersTab — Superba display_value hint (MB_SP_DYE)", () => {
  beforeEach(() => {
    vi.mocked(useProductRequiredParams).mockReset()
  })

  const DYE_ENTRY = baseEntry({
    paramId: "p-dye",
    paramCode: "MB_SP_DYE",
    paramName: "MB SP Dye",
    dataType: "TEXT",
    paramCategory: "REQUIRED",
    valueText: "STORED-DYE-CODE",
    displayValue: "SUPERBA RED 12",
  })

  it("shows the colour name with a Superba badge, alongside the stored value", () => {
    vi.mocked(useProductRequiredParams).mockReturnValue({
      data: [DYE_ENTRY],
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    render(<ProductParametersTab productSysId={1} />)

    expect(screen.getByTestId("param-display-value")).toHaveTextContent("SUPERBA RED 12")
    expect(screen.getByText("Superba")).toBeInTheDocument()
    // Stored value remains in its editable input.
    expect(screen.getByDisplayValue("STORED-DYE-CODE")).toBeInTheDocument()
  })

  it("renders nothing extra when displayValue is empty", () => {
    vi.mocked(useProductRequiredParams).mockReturnValue({
      data: [{ ...DYE_ENTRY, displayValue: "" }],
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    render(<ProductParametersTab productSysId={1} />)

    expect(screen.queryByTestId("param-display-value")).not.toBeInTheDocument()
  })
})

describe("normalizeRequiredEntry displayValue", () => {
  it("accepts camelCase and snake_case and defaults to empty", async () => {
    const { normalizeRequiredEntry } = await import("@/types/finance/cost-product-parameter")
    expect(normalizeRequiredEntry({ displayValue: "A" }).displayValue).toBe("A")
    expect(normalizeRequiredEntry({ display_value: "B" }).displayValue).toBe("B")
    expect(normalizeRequiredEntry({}).displayValue).toBe("")
  })
})
