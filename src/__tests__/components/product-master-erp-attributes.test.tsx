import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const createMutate = vi.fn().mockResolvedValue({})
vi.mock("@/hooks/finance/use-cost-product-master", () => ({
  useCreateCostProductMaster: () => ({ mutateAsync: createMutate, isPending: false }),
  useUpdateCostProductMaster: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock("@/components/finance/comboboxes", () => ({
  ProductTypeCombobox: ({ onChange }: { onChange: (v: number) => void }) => (
    <button type="button" onClick={() => onChange(3)}>pick-type</button>
  ),
}))

import { ProductMasterFormDialog } from "@/components/finance/cost-product-master/product-master-form-dialog"

async function fill(user: ReturnType<typeof userEvent.setup>, prdPerDay: string) {
  await user.click(screen.getByText("pick-type"))
  await user.type(screen.getByPlaceholderText("Example: POY 75/72 SD BRIGHT"), "POY")
  await user.type(screen.getByLabelText("FG Type"), "FG1")
  await user.type(screen.getByLabelText("Production per day"), prdPerDay)
  await user.click(screen.getByRole("button", { name: "Create" }))
}

describe("ProductMasterFormDialog ERP attributes", () => {
  beforeEach(() => createMutate.mockClear())

  it("renders the ERP section", () => {
    render(<ProductMasterFormDialog open onOpenChange={() => {}} />)
    expect(screen.getByText("ERP attributes (optional)")).toBeInTheDocument()
  })

  it("rejects an invalid prdPerDay", async () => {
    const user = userEvent.setup()
    render(<ProductMasterFormDialog open onOpenChange={() => {}} />)
    await fill(user, "abc")
    expect(await screen.findByText(/Up to 15 digits/)).toBeInTheDocument()
    expect(createMutate).not.toHaveBeenCalled()
  })

  it("includes ERP fields in the submit payload", async () => {
    const user = userEvent.setup()
    render(<ProductMasterFormDialog open onOpenChange={() => {}} />)
    await fill(user, "12.5")
    await waitFor(() => expect(createMutate).toHaveBeenCalled())
    expect(createMutate.mock.calls[0][0]).toMatchObject({ erpFgType: "FG1", erpPrdPerDay: "12.5" })
  })
})
