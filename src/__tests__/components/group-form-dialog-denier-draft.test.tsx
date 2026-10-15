/** GroupFormDialog — "Divide denier by Spandex Draft" checkbox. */
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

const DENIER_PH = /e\.g\. 20 \/ 40 \/ 70/i
const CB = { name: /Divide denier by Spandex Draft/i }

describe("GroupFormDialog — denierUseDraft", () => {
  it("is disabled while denier is empty", () => {
    render(<GroupFormDialog open onOpenChange={vi.fn()} group={null} period="2026-09" />)
    expect(screen.getByRole("checkbox", CB)).toBeDisabled()
  })

  it("sends denierUseDraft true on create when checked", async () => {
    const user = userEvent.setup()
    render(<GroupFormDialog open onOpenChange={vi.fn()} group={null} period="2026-09" />)
    await user.type(screen.getByPlaceholderText(/GRP-CHIPS/i), "SPD1")
    await user.type(screen.getByPlaceholderText(/Chips Group A/i), "Spandex 40")
    await user.type(screen.getByPlaceholderText(DENIER_PH), "40")
    await user.click(screen.getByRole("checkbox", CB))
    await user.click(screen.getByRole("button", { name: /Create & Go to Details/i }))
    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled())
    expect(createMutateAsync.mock.calls[0][0].denierUseDraft).toBe(true)
  })

  it("sends denierUseDraft false on create when left unchecked", async () => {
    const user = userEvent.setup()
    render(<GroupFormDialog open onOpenChange={vi.fn()} group={null} period="2026-09" />)
    await user.type(screen.getByPlaceholderText(/GRP-CHIPS/i), "POY1")
    await user.type(screen.getByPlaceholderText(/Chips Group A/i), "POY 80")
    await user.type(screen.getByPlaceholderText(DENIER_PH), "80")
    await user.click(screen.getByRole("button", { name: /Create & Go to Details/i }))
    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled())
    expect(createMutateAsync.mock.calls[0][0].denierUseDraft).toBe(false)
  })

  it("loads existing value and sends it on update (true then unchecked false)", async () => {
    const user = userEvent.setup()
    const group = {
      groupHeadId: "gh-1", groupCode: "SPD1", groupName: "Spandex", isActive: true,
      denier: 40, denierUseDraft: true,
    } as RMGroupHead
    render(<GroupFormDialog open onOpenChange={vi.fn()} group={group} period="2026-09" />)
    const cb = await screen.findByRole("checkbox", CB)
    await waitFor(() => expect(cb).toBeChecked())
    await user.click(screen.getByRole("button", { name: /Update/i }))
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    expect(updateMutateAsync.mock.calls[0][0].data.denierUseDraft).toBe(true)

    await user.click(cb)
    await user.click(screen.getByRole("button", { name: /Update/i }))
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(2))
    expect(updateMutateAsync.mock.calls[1][0].data.denierUseDraft).toBe(false)
  })
})
