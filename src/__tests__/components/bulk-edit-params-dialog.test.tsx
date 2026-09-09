/**
 * Tests for BulkEditParamsDialog (bulk-simplify-attach-flexible rewrite,
 * design doc Part 1) — two independent sections instead of the old unified
 * operation-type builder:
 *   1. "Set parameter value" — pick param -> dataType-gated value input ->
 *      "Add" appends a removable row; submits as upsertValue ops.
 *   2. "Remove parameter(s)" — multi-select -> removable chips; submits as
 *      removeApplicable ops.
 *
 * Also covers:
 *   - skipMissingApplicable is always hardcoded false (no UI toggle)
 *   - no AlertDialog confirm step — the submit button calls the mutation
 *     directly
 *   - same-param-in-both-sections guard disables submit
 *   - CALCULATED / MASTER_LOOKUP category params never appear in either
 *     picker (bulk-param-combobox.tsx's category exclusion)
 *   - Remove picker is scoped to the union of params applicable on the
 *     selected products (post-ship fix 1b); Set-value picker stays global
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactElement } from "react"

import { DataType, ParamCategory } from "@/types/generated/finance/v1/parameter"
import type { Parameter } from "@/types/finance/parameter"

// jsdom doesn't implement scrollIntoView, which cmdk calls on highlight changes.
Element.prototype.scrollIntoView = vi.fn()

// ─── Module mocks ─────────────────────────────────────────────────────────────

function makeParam(overrides: Partial<Parameter> = {}): Parameter {
  return {
    paramId: "p-1",
    paramCode: "TEMP",
    paramName: "Temperature",
    paramShortName: "Temp",
    dataType: DataType.DATA_TYPE_NUMBER,
    paramCategory: ParamCategory.PARAM_CATEGORY_INPUT,
    uomId: "",
    uomCode: "",
    defaultValue: "",
    minValue: "",
    maxValue: "",
    isActive: true,
    ownerDepartment: "",
    isRequiredForCosting: false,
    isPeriodDependent: false,
    lookupMasterCode: "",
    displayOrder: 0,
    displayGroup: "",
    notes: "",
    isApprovalVisible: false,
    approvalDisplayOrder: 0,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  } as Parameter
}

const PARAM_NUMBER = makeParam({ paramId: "p-1", paramCode: "TEMP", paramName: "Temperature" })
const PARAM_TEXT = makeParam({
  paramId: "p-2",
  paramCode: "GRADE",
  paramName: "Grade",
  dataType: DataType.DATA_TYPE_TEXT,
})
const PARAM_BOOL = makeParam({
  paramId: "p-3",
  paramCode: "IS_HOT",
  paramName: "Is Hot",
  dataType: DataType.DATA_TYPE_BOOLEAN,
})
const PARAM_CALCULATED = makeParam({
  paramId: "p-4",
  paramCode: "CALC_COST",
  paramName: "Calculated Cost",
  paramCategory: ParamCategory.PARAM_CATEGORY_CALCULATED,
})
const PARAM_LOOKUP = makeParam({
  paramId: "p-5",
  paramCode: "MB_CODE",
  paramName: "MB Lookup Code",
  paramCategory: ParamCategory.PARAM_CATEGORY_MASTER_LOOKUP,
})

let paramList: Parameter[] = []
const mutateAsync = vi.fn()

vi.mock("@/hooks/finance/use-parameter", () => ({
  useParameters: () => ({ data: { data: paramList }, isLoading: false }),
}))

vi.mock("@/hooks/finance/use-bulk-edit-product-params", () => ({
  useBulkEditProductParams: () => ({ mutateAsync, isPending: false }),
}))

// The Remove picker fans out fetch() calls (via useQueries in
// bulk-param-combobox.tsx) to /api/v1/finance/cost-product-parameters/products/:id
// — one per selected productSysId — and unions the returned paramIds. Map
// productSysId -> the params applicable on that product for each test.
let applicableParamsByProduct: Record<number, Parameter[]> = {}

function mockFetchResponse(params: Parameter[]) {
  return {
    ok: true,
    json: async () => ({
      data: params.map((p) => ({
        paramId: p.paramId,
        paramCode: p.paramCode,
        paramName: p.paramName,
        dataType: p.dataType,
        paramCategory: p.paramCategory,
      })),
    }),
  } as Response
}

// ─── Import under test (after mocks are registered) ────────────────────────────

import { BulkEditParamsDialog } from "@/components/finance/cost-product-master/bulk-edit-params-dialog"

// The Remove picker's applicable-params scoping (fix 1b) fans out via
// useQueries, which requires a QueryClientProvider ancestor — wrap every
// render in a fresh, retry-disabled client so tests stay fast and isolated.
function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

function renderDialog(onQueued = vi.fn()) {
  renderWithQuery(
    <BulkEditParamsDialog
      open
      onOpenChange={vi.fn()}
      productSysIds={[1, 2, 3]}
      onQueued={onQueued}
    />,
  )
  return { onQueued }
}

async function openSetValuePicker(user: ReturnType<typeof userEvent.setup>) {
  const combos = screen.getAllByRole("combobox")
  // First combobox in DOM order is the Set-value section's picker.
  await user.click(combos[0])
}

async function openRemovePicker(user: ReturnType<typeof userEvent.setup>) {
  const combos = screen.getAllByRole("combobox")
  await user.click(combos[1])
}

describe("BulkEditParamsDialog", () => {
  beforeEach(() => {
    mutateAsync.mockReset()
    paramList = [PARAM_NUMBER, PARAM_TEXT, PARAM_BOOL, PARAM_CALCULATED, PARAM_LOOKUP]
    // Default: all three products (the default renderDialog productSysIds)
    // have every non-excluded param applicable, so existing assertions about
    // Temperature/Grade/Is Hot showing in the Remove picker keep working.
    applicableParamsByProduct = {
      1: [PARAM_NUMBER, PARAM_TEXT, PARAM_BOOL],
      2: [PARAM_NUMBER, PARAM_TEXT, PARAM_BOOL],
      3: [PARAM_NUMBER, PARAM_TEXT, PARAM_BOOL],
    }
    vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString()
      const match = /\/cost-product-parameters\/products\/(\d+)/.exec(url)
      if (match) {
        const productSysId = Number(match[1])
        return mockFetchResponse(applicableParamsByProduct[productSysId] ?? [])
      }
      throw new Error(`Unhandled fetch in test: ${url}`)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders exactly two sections and no add_applicable / skip-missing UI", () => {
    renderDialog()
    expect(screen.getByText("Set parameter value")).toBeInTheDocument()
    expect(screen.getByText("Remove parameter(s)")).toBeInTheDocument()
    expect(screen.queryByText(/add applicable parameter/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/skip products missing/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/required for costing/i)).not.toBeInTheDocument()
  })

  it("excludes CALCULATED and MASTER_LOOKUP params from the Set-value picker", async () => {
    const user = userEvent.setup()
    renderDialog()
    await openSetValuePicker(user)

    expect(screen.getByText("Temperature")).toBeInTheDocument()
    expect(screen.getByText("Grade")).toBeInTheDocument()
    expect(screen.getByText("Is Hot")).toBeInTheDocument()
    expect(screen.queryByText("Calculated Cost")).not.toBeInTheDocument()
    expect(screen.queryByText("MB Lookup Code")).not.toBeInTheDocument()
  })

  it("excludes CALCULATED and MASTER_LOOKUP params from the Remove multi-picker", async () => {
    const user = userEvent.setup()
    renderDialog()
    await openRemovePicker(user)

    expect(screen.getByText("Temperature")).toBeInTheDocument()
    expect(screen.queryByText("Calculated Cost")).not.toBeInTheDocument()
    expect(screen.queryByText("MB Lookup Code")).not.toBeInTheDocument()
  })

  it("scopes the Remove picker to the union of params applicable on selected products", async () => {
    applicableParamsByProduct = {
      10: [PARAM_NUMBER],
      20: [PARAM_TEXT],
    }
    const user = userEvent.setup()
    renderWithQuery(
      <BulkEditParamsDialog open onOpenChange={vi.fn()} productSysIds={[10, 20]} onQueued={vi.fn()} />,
    )
    await openRemovePicker(user)

    // Union of product 10's [Temperature] and product 20's [Grade].
    expect(screen.getByText("Temperature")).toBeInTheDocument()
    expect(screen.getByText("Grade")).toBeInTheDocument()
    // Is Hot isn't applicable on either selected product -> excluded.
    expect(screen.queryByText("Is Hot")).not.toBeInTheDocument()
  })

  it("shows an empty state in the Remove picker when no selected product has any applicable params", async () => {
    applicableParamsByProduct = { 30: [] }
    const user = userEvent.setup()
    renderWithQuery(<BulkEditParamsDialog open onOpenChange={vi.fn()} productSysIds={[30]} onQueued={vi.fn()} />)
    await openRemovePicker(user)

    expect(await screen.findByText(/no parameters are applicable/i)).toBeInTheDocument()
  })

  it("keeps the Set-value picker global regardless of product scoping (can add brand-new params)", async () => {
    applicableParamsByProduct = { 30: [] }
    const user = userEvent.setup()
    renderWithQuery(<BulkEditParamsDialog open onOpenChange={vi.fn()} productSysIds={[30]} onQueued={vi.fn()} />)
    await openSetValuePicker(user)

    // Even though product 30 has zero applicable params, Set-value still
    // offers the full (category-excluded) catalog.
    expect(screen.getByText("Temperature")).toBeInTheDocument()
    expect(screen.getByText("Grade")).toBeInTheDocument()
    expect(screen.getByText("Is Hot")).toBeInTheDocument()
  })

  it("adds a NUMBER-type set-value row and shows it in the list", async () => {
    const user = userEvent.setup()
    renderDialog()

    await openSetValuePicker(user)
    await user.click(screen.getByText("Temperature"))

    const numberInput = screen.getByPlaceholderText("Numeric value")
    await user.type(numberInput, "42")
    await user.click(screen.getByRole("button", { name: /^add$/i }))

    expect(screen.getByText(/Temperature/)).toBeInTheDocument()
    expect(screen.getByText(/= 42/)).toBeInTheDocument()
  })

  it("adds a BOOLEAN-type set-value row via the switch, defaulting to FALSE", async () => {
    const user = userEvent.setup()
    renderDialog()

    await openSetValuePicker(user)
    await user.click(screen.getByText("Is Hot"))

    // Boolean params don't require typing a value — the Add button should be enabled immediately.
    const addButton = screen.getByRole("button", { name: /^add$/i })
    expect(addButton).toBeEnabled()
    await user.click(addButton)

    expect(screen.getByText(/= FALSE/)).toBeInTheDocument()
  })

  it("adds a chip via the Remove multi-picker and it becomes removable", async () => {
    const user = userEvent.setup()
    renderDialog()

    await openRemovePicker(user)
    await user.click(screen.getByText("Grade"))

    // Close popover, chip should render with the param name.
    await user.keyboard("{Escape}")
    const chip = screen.getByText("Grade").closest("span")
    expect(chip).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /remove grade/i })).toBeInTheDocument()
  })

  it("keeps submit disabled until at least one row or chip exists", () => {
    renderDialog()
    expect(screen.getByRole("button", { name: /apply to 3 products/i })).toBeDisabled()
  })

  it("disables submit and shows an inline warning when the same param is set AND removed", async () => {
    const user = userEvent.setup()
    renderDialog()

    // Add "Temperature" as a set-value row.
    await openSetValuePicker(user)
    await user.click(screen.getByText("Temperature"))
    await user.type(screen.getByPlaceholderText("Numeric value"), "10")
    await user.click(screen.getByRole("button", { name: /^add$/i }))

    const submitButton = screen.getByRole("button", { name: /apply to 3 products/i })
    expect(submitButton).toBeEnabled()

    // Also pick "Temperature" in the Remove section -> contradiction.
    await openRemovePicker(user)
    const listbox = screen.getByRole("listbox")
    await user.click(within(listbox).getByText("Temperature"))
    await user.keyboard("{Escape}")

    expect(screen.getByText(/can.t be both set and removed/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it("submits with skipMissingApplicable hardcoded false and no confirmation dialog", async () => {
    const user = userEvent.setup()
    mutateAsync.mockResolvedValue({ jobId: "job-1", jobCode: "JOB-1", status: "QUEUED" })
    const { onQueued } = renderDialog()

    await openSetValuePicker(user)
    await user.click(screen.getByText("Temperature"))
    await user.type(screen.getByPlaceholderText("Numeric value"), "42")
    await user.click(screen.getByRole("button", { name: /^add$/i }))

    const submitButton = screen.getByRole("button", { name: /apply to 3 products/i })
    expect(submitButton).toBeEnabled()
    await user.click(submitButton)

    // No AlertDialog confirmation step should appear.
    expect(screen.queryByText(/continue\?/i)).not.toBeInTheDocument()

    expect(mutateAsync).toHaveBeenCalledWith({
      productSysIds: [1, 2, 3],
      operations: [
        {
          upsertValue: {
            paramId: "p-1",
            valueNumeric: "42",
            valueText: "",
            valueFlag: false,
            hasValueFlag: false,
          },
        },
      ],
      skipMissingApplicable: false,
    })
    expect(onQueued).toHaveBeenCalledWith({ jobId: "job-1", jobCode: "JOB-1", status: "QUEUED" })
  })

  it("submits remove-only operations built from chips", async () => {
    const user = userEvent.setup()
    mutateAsync.mockResolvedValue({ jobId: "job-2", jobCode: "JOB-2", status: "QUEUED" })
    renderDialog()

    await openRemovePicker(user)
    await user.click(screen.getByText("Grade"))
    await user.keyboard("{Escape}")

    const submitButton = screen.getByRole("button", { name: /apply to 3 products/i })
    await user.click(submitButton)

    expect(mutateAsync).toHaveBeenCalledWith({
      productSysIds: [1, 2, 3],
      operations: [{ removeApplicable: { paramId: "p-2" } }],
      skipMissingApplicable: false,
    })
  })
})
