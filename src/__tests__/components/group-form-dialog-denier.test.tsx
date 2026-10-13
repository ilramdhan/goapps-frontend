/** GroupFormDialog — denier field: absent on create when empty, 0 clears on update. */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { render } from "../utils"

const createMutateAsync = vi.fn()
const updateMutateAsync = vi.fn()

vi.mock("@/hooks/finance/use-rm-group", () => ({
  useCreateRMGroup: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateRMGroup: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
}))

import { GroupFormDialog } from "@/components/finance/rm-pricing/groups/group-form-dialog"
import type { RMGroupHead } from "@/types/finance/rm-group"

beforeEach(() => {
  createMutateAsync.mockReset()
  updateMutateAsync.mockReset()
  createMutateAsync.mockResolvedValue({ groupHeadId: "new-id" })
  updateMutateAsync.mockResolvedValue({})
})

const existing = (denier: number) =>
  ({ groupHeadId: "gh-1", groupCode: "SPD1", groupName: "Spandex", isActive: true, denier }) as RMGroupHead

describe("GroupFormDialog — denier", () => {
  it("sends denier on create when entered", async () => {
    const user = userEvent.setup()
    render(<GroupFormDialog open onOpenChange={vi.fn()} group={null} period="2026-09" />)
    await user.type(screen.getByPlaceholderText(/GRP-CHIPS/i), "SPD1")
    await user.type(screen.getByPlaceholderText(/Chips Group A/i), "Spandex 40")
    await user.type(screen.getByPlaceholderText(/e\.g\. 20 \/ 40 \/ 70/i), "40")
    await user.click(screen.getByRole("button", { name: /Create & Go to Details/i }))
    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled())
    expect(createMutateAsync.mock.calls[0][0].denier).toBe(40)
  })

  it("omits denier on create when empty", async () => {
    const user = userEvent.setup()
    render(<GroupFormDialog open onOpenChange={vi.fn()} group={null} period="2026-09" />)
    await user.type(screen.getByPlaceholderText(/GRP-CHIPS/i), "SPD2")
    await user.type(screen.getByPlaceholderText(/Chips Group A/i), "Spandex")
    await user.click(screen.getByRole("button", { name: /Create & Go to Details/i }))
    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled())
    expect(createMutateAsync.mock.calls[0][0].denier).toBeUndefined()
  })

  it("sends 0 on update when an existing denier is cleared", async () => {
    const user = userEvent.setup()
    render(<GroupFormDialog open onOpenChange={vi.fn()} group={existing(40)} period="2026-09" />)
    const input = await screen.findByPlaceholderText(/e\.g\. 20 \/ 40 \/ 70/i)
    await waitFor(() => expect(input).toHaveValue(40))
    await user.clear(input)
    await user.click(screen.getByRole("button", { name: /Update/i }))
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled())
    expect(updateMutateAsync.mock.calls[0][0].data.denier).toBe(0)
  })
})
