import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const updateMutate = vi.fn().mockResolvedValue({})
vi.mock("@/hooks/finance/use-cost-product-master", () => ({
  useCreateCostProductMaster: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCostProductMaster: () => ({ mutateAsync: updateMutate, isPending: false }),
}))
vi.mock("@/components/finance/comboboxes", () => ({ ProductTypeCombobox: () => null }))

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
