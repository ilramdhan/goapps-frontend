/**
 * GroupFormDialog — isOilGroup toggle submission (oil-cost-rm-group P5-T1, D2/D12).
 *
 * The "Oil Group" switch is global (not period-versioned) and must be
 * forwarded verbatim on both create and update payloads.
 */
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

describe("GroupFormDialog — isOilGroup", () => {
  it("submits isOilGroup: true on create when the Oil Group switch is toggled on", async () => {
    const user = userEvent.setup()
    render(
      <GroupFormDialog open onOpenChange={vi.fn()} group={null} period="2026-09" />,
    )

    await user.type(screen.getByPlaceholderText(/GRP-CHIPS/i), "GRP-OIL-1")
    await user.type(screen.getByPlaceholderText(/Chips Group A/i), "Oil Group 1")

    const oilSwitch = screen.getByRole("switch", { name: /Oil Group/i })
    await user.click(oilSwitch)

    await user.click(screen.getByRole("button", { name: /Create & Go to Details/i }))

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled())
    const payload = createMutateAsync.mock.calls[0][0]
    expect(payload.isOilGroup).toBe(true)
  })

  it("defaults isOilGroup to false on create when left untouched", async () => {
    const user = userEvent.setup()
    render(
      <GroupFormDialog open onOpenChange={vi.fn()} group={null} period="2026-09" />,
    )

    await user.type(screen.getByPlaceholderText(/GRP-CHIPS/i), "GRP-NON-OIL")
    await user.type(screen.getByPlaceholderText(/Chips Group A/i), "Non Oil Group")
    await user.click(screen.getByRole("button", { name: /Create & Go to Details/i }))

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled())
    expect(createMutateAsync.mock.calls[0][0].isOilGroup).toBe(false)
  })

  it("carries the existing isOilGroup value through on update", async () => {
    const user = userEvent.setup()
    const existing: Partial<RMGroupHead> = {
      groupHeadId: "gh-1",
      groupCode: "GRP-OIL-1",
      groupName: "Oil Group 1",
      isActive: true,
      isOilGroup: true,
    }

    render(
      <GroupFormDialog
        open
        onOpenChange={vi.fn()}
        group={existing as RMGroupHead}
        period="2026-09"
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole("switch", { name: /Oil Group/i })).toBeChecked()
    })

    await user.click(screen.getByRole("button", { name: /Update/i }))

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled())
    expect(updateMutateAsync.mock.calls[0][0].data.isOilGroup).toBe(true)
  })
})
