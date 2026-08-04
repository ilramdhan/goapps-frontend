/**
 * Tests for WORmPanel — the RM allocation panel (PLAN-03 / spec S-5).
 *
 * The regression these exist for: the panel keeps the editor's line state in the
 * parent while a child renders it. An earlier revision let the child own a local
 * copy seeded at mount, so the parent's copy stayed empty until the user touched
 * a field — and pressing "Save Allocations" without editing posted
 * `allocations: []`, wiping every existing allocation and making a route prefill
 * impossible to accept as-is.
 *
 * These assert on the payload actually handed to the save mutation, because that
 * is the value the bug corrupted.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { WorkOrder, WORmAllocation } from "@/types/ppc/work-order"
import { RMSource as RMSourceEnum } from "@/types/generated/ppc/v1/common"

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mutateAsync = vi.fn()

vi.mock("@/hooks/ppc/use-work-order", () => ({
  useSaveWORmAllocations: () => ({ mutateAsync, isPending: false }),
  useSuggestWORmAllocations: vi.fn(),
}))

// ─── Import under test (after all mocks are registered) ──────────────────────

import { WORmPanel } from "@/components/ppc/work-order/wo-rm-panel"
import { useSuggestWORmAllocations } from "@/hooks/ppc/use-work-order"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function alloc(overrides: Partial<WORmAllocation> = {}): WORmAllocation {
  return {
    wraId: 1,
    woId: 7,
    crmRmId: 101,
    rmType: "ITEM",
    lotNo: "LOT-A",
    rmSource: RMSourceEnum.RM_SOURCE_STORE,
    freshBox: "Fresh",
    shadeCode: "SH1",
    qtyAllocated: "600",
    notes: "",
    rmCode: "CHIPS_SD",
    rmName: "Chips Semi Dull",
    routeStageName: "Spinning",
    routeLevel: 1,
    routeRmRatio: "0.6",
    ...overrides,
  } as WORmAllocation
}

function workOrder(rmAllocations: WORmAllocation[]): WorkOrder {
  return { woId: 7, rmAllocations } as WorkOrder
}

/** Shapes the mocked suggestion query result. */
function mockSuggestions(data: WORmAllocation[] | undefined, isFetching = false) {
  vi.mocked(useSuggestWORmAllocations).mockReturnValue({
    data,
    isLoading: false,
    isFetching,
  } as unknown as ReturnType<typeof useSuggestWORmAllocations>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mutateAsync.mockResolvedValue({})
})

describe("WORmPanel save payload", () => {
  it("saves the existing allocations unchanged when the editor is opened and saved without edits", async () => {
    // NEW-1 regression: this posted `allocations: []` and wiped the WO.
    const saved = [alloc({ wraId: 1, crmRmId: 101 }), alloc({ wraId: 2, crmRmId: 102, lotNo: "LOT-B" })]
    mockSuggestions([])

    render(<WORmPanel workOrder={workOrder(saved)} />)
    await userEvent.click(screen.getByRole("button", { name: /edit/i }))
    await userEvent.click(await screen.findByRole("button", { name: /save allocations/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    const payload = mutateAsync.mock.calls[0][0]
    expect(payload.woId).toBe(7)
    expect(payload.allocations).toHaveLength(2)
    expect(payload.allocations.map((a: { crmRmId: number }) => a.crmRmId)).toEqual([101, 102])
    expect(payload.allocations[1].lotNo).toBe("LOT-B")
  })

  it("persists a route prefill as-is when saved without edits", async () => {
    // The point of S-5.1: an accepted prefill must reach the backend.
    mockSuggestions([alloc({ wraId: 0, crmRmId: 205, lotNo: "", qtyAllocated: "500" })])

    render(<WORmPanel workOrder={workOrder([])} />)
    await userEvent.click(screen.getByRole("button", { name: /edit/i }))
    await userEvent.click(await screen.findByRole("button", { name: /save allocations/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    const payload = mutateAsync.mock.calls[0][0]
    expect(payload.allocations).toHaveLength(1)
    expect(payload.allocations[0].crmRmId).toBe(205)
    expect(payload.allocations[0].qtyAllocated).toBe("500")
  })

  it("sends only the wire fields, never the resolved labels (S-5.8)", async () => {
    mockSuggestions([])
    render(<WORmPanel workOrder={workOrder([alloc()])} />)
    await userEvent.click(screen.getByRole("button", { name: /edit/i }))
    await userEvent.click(await screen.findByRole("button", { name: /save allocations/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(Object.keys(mutateAsync.mock.calls[0][0].allocations[0]).sort()).toEqual(
      ["crmRmId", "freshBox", "lotNo", "notes", "qtyAllocated", "rmSource", "rmType", "shadeCode"].sort()
    )
  })

  it("clears every line, saves an empty set, and does not re-prefill on reopen", async () => {
    // CLEANUP-1 regression: `savedLines` must record a deliberate clear as `[]`
    // and keep `hasSaved` true, or reopening resurrects the route prefill and
    // silently undoes the user's deletion.
    const suggestion = [alloc({ wraId: 0, crmRmId: 401, lotNo: "", qtyAllocated: "250" })]
    mockSuggestions(suggestion)
    const saved = [alloc({ wraId: 1, crmRmId: 401 })]

    const { rerender } = render(<WORmPanel workOrder={workOrder(saved)} />)
    await userEvent.click(screen.getByRole("button", { name: /edit/i }))

    // Delete every line, then save.
    const removeButtons = await screen.findAllByRole("button", { name: /remove line/i })
    for (const btn of removeButtons) await userEvent.click(btn)
    expect(screen.queryAllByRole("button", { name: /remove line/i })).toHaveLength(0)

    await userEvent.click(screen.getByRole("button", { name: /save allocations/i }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync.mock.calls[0][0].allocations).toEqual([])

    // The backend now reports no allocations. Reopening must show the cleared
    // set, NOT the route suggestion that is still cached and still available.
    rerender(<WORmPanel workOrder={workOrder([])} />)
    await userEvent.click(screen.getByRole("button", { name: /edit/i }))

    expect(screen.queryAllByRole("button", { name: /remove line/i })).toHaveLength(0)
    expect(screen.queryByText(/no released route/i)).toBeNull()

    // And saving again still posts an empty set, not a resurrected prefill.
    await userEvent.click(screen.getByRole("button", { name: /save allocations/i }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2))
    expect(mutateAsync.mock.calls[1][0].allocations).toEqual([])
  })

  it("keeps the editor mounted and the payload stable when a suggestion refetch fires mid-session", async () => {
    // NEW-2 regression: any WO mutation prefix-matches the suggestion key, so a
    // refetch must not tear down and re-seed a body being edited.
    mockSuggestions([alloc({ wraId: 0, crmRmId: 301, qtyAllocated: "100" })])
    const { rerender } = render(<WORmPanel workOrder={workOrder([])} />)
    await userEvent.click(screen.getByRole("button", { name: /edit/i }))
    expect(await screen.findByRole("button", { name: /save allocations/i })).toBeTruthy()

    // A refetch starts (isFetching true, data still present).
    mockSuggestions([alloc({ wraId: 0, crmRmId: 301, qtyAllocated: "100" })], true)
    rerender(<WORmPanel workOrder={workOrder([])} />)

    // The editor is still usable, not replaced by the loading placeholder.
    const saveBtn = screen.getByRole("button", { name: /save allocations/i })
    expect((saveBtn as HTMLButtonElement).disabled).toBe(false)
    await userEvent.click(saveBtn)
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync.mock.calls[0][0].allocations).toHaveLength(1)
  })
})

describe("WORmPanel never exposes an id (S-5.2)", () => {
  it("renders the RM code and name, not the numeric crm_rm_id", () => {
    mockSuggestions([])
    render(<WORmPanel workOrder={workOrder([alloc({ crmRmId: 909101 })])} />)

    expect(screen.getByText("CHIPS_SD")).toBeTruthy()
    expect(screen.getByText("Chips Semi Dull")).toBeTruthy()
    expect(screen.queryByText("909101")).toBeNull()
  })

  it("says a line is off-route rather than showing its id when labels are absent", () => {
    mockSuggestions([])
    render(<WORmPanel workOrder={workOrder([alloc({ crmRmId: 909102, rmCode: "", rmName: "" })])} />)

    expect(screen.getByText(/not in the current route/i)).toBeTruthy()
    expect(screen.queryByText("909102")).toBeNull()
  })

  it("never renders a raw id inside the EDITOR, only in the read-only table", async () => {
    // The editor is the path the original defect lived on: it used to render an
    // `<Input type="number" placeholder="RM ID">` bound to crm_rm_id. The picker
    // still takes `value={line.crmRmId}`, so the id reaching the DOM as text or
    // as an input value would be a silent regression of D3 / S-5.2.
    const id = 909103
    mockSuggestions([])
    const { container } = render(
      <WORmPanel workOrder={workOrder([alloc({ crmRmId: id, rmCode: "CHIPS_SD", rmName: "Chips Semi Dull" })])} />
    )
    await userEvent.click(screen.getByRole("button", { name: /edit/i }))
    await screen.findByRole("button", { name: /save allocations/i })

    // The id must appear in no rendered text anywhere (dialog included) …
    expect(screen.queryByText(String(id))).toBeNull()
    expect(container.ownerDocument.body.textContent).not.toContain(String(id))

    // … and in no form control's value, which textContent would not catch.
    const values = Array.from(
      container.ownerDocument.body.querySelectorAll("input, textarea")
    ).map((el) => (el as HTMLInputElement).value)
    expect(values).not.toContain(String(id))

    // The RM is still identified — by code and name.
    expect(screen.getAllByText("CHIPS_SD").length).toBeGreaterThan(0)
  })
})
