import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const updateMutate = vi.fn().mockResolvedValue({})
vi.mock("@/hooks/finance/use-cost-product-master", () => ({
  useCreateCostProductMaster: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCostProductMaster: () => ({ mutateAsync: updateMutate, isPending: false }),
}))
vi.mock("@/components/finance/comboboxes", () => ({ ProductTypeCombobox: () => null }))

vi.mock("@/components/finance/shade", () => ({
  ShadeCombobox: ({ code }: { code?: string }) => <div data-testid="shade-combobox">{code}</div>,
}))
import { ProductMasterFormDialog } from "@/components/finance/cost-product-master/product-master-form-dialog"
import { normalizeCostProductMaster } from "@/types/finance/cost-product-master"

const product = normalizeCostProductMaster({
  productSysId: 7, productCode: "CST1", productTypeId: 1, productName: "X",
  rmRatioModeOverride: "DENIER",
})

describe("ProductMasterFormDialog Mode Rasio RM", () => {
  beforeEach(() => updateMutate.mockClear())

  it("shows the select only when editing", () => {
    const { unmount } = render(<ProductMasterFormDialog open onOpenChange={() => {}} />)
    expect(screen.queryByLabelText("Mode Rasio RM")).toBeNull()
    unmount()
    render(<ProductMasterFormDialog open onOpenChange={() => {}} product={product} />)
    expect(screen.getByLabelText("Mode Rasio RM")).toBeInTheDocument()
  })

  it("submits the current override on update", async () => {
    const user = userEvent.setup()
    render(<ProductMasterFormDialog open onOpenChange={() => {}} product={product} />)
    await user.click(screen.getByRole("button", { name: "Save changes" }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    expect(updateMutate.mock.calls[0][0].rmRatioModeOverride).toBe("DENIER")
  })
})

describe("ProductMasterFormDialog fixcost min threshold", () => {
  beforeEach(() => updateMutate.mockClear())
  const label = "Min Fixed Cost Threshold (/kg)"
  const save = () => screen.getByRole("button", { name: "Save changes" })

  it("is not sent when unchanged", async () => {
    const user = userEvent.setup()
    render(<ProductMasterFormDialog open onOpenChange={() => {}} product={product} />)
    await user.click(save())
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    expect(updateMutate.mock.calls[0][0]).not.toHaveProperty("fixcostMinThreshold")
  })

  it("is sent when changed", async () => {
    const user = userEvent.setup()
    render(<ProductMasterFormDialog open onOpenChange={() => {}} product={product} />)
    await user.type(screen.getByLabelText(label), "0.05")
    await user.click(save())
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    expect(updateMutate.mock.calls[0][0].fixcostMinThreshold).toBe(0.05)
  })

  it("rejects out-of-range", async () => {
    const user = userEvent.setup()
    render(<ProductMasterFormDialog open onOpenChange={() => {}} product={product} />)
    const input = screen.getByLabelText(label)
    await user.type(input, "2")
    fireEvent.submit(input.closest("form")!) // bypass native max validation
    expect(await screen.findByText("Must be between 0 and 1")).toBeInTheDocument()
    expect(updateMutate).not.toHaveBeenCalled()
  })

  it("accepts 6 decimals", async () => {
    const user = userEvent.setup()
    render(<ProductMasterFormDialog open onOpenChange={() => {}} product={product} />)
    await user.type(screen.getByLabelText(label), "0.050125")
    await user.click(save())
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    expect(updateMutate.mock.calls[0][0].fixcostMinThreshold).toBe(0.050125)
  })

  it("rejects more than 6 decimals", async () => {
    const user = userEvent.setup()
    render(<ProductMasterFormDialog open onOpenChange={() => {}} product={product} />)
    const input = screen.getByLabelText(label)
    await user.type(input, "0.0501251")
    fireEvent.submit(input.closest("form")!)
    expect(await screen.findByText("Max 6 decimal places")).toBeInTheDocument()
    expect(updateMutate).not.toHaveBeenCalled()
  })
})
