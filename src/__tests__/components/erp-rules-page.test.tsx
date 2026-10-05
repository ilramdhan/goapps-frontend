import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

const perms = new Set<string>()
const useGradeGroups = vi.fn()

vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({ hasPermission: (c: string) => perms.has(c) }),
}))

const rule = { id: 1, fgType: "FG1", prodType: "POY", gradeGroup: "NS", basis: "B", valLoss: "1.5", isActive: true, updatedAt: "" }
const mutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }

vi.mock("@/hooks/finance/use-erp-rule", () => ({
  useValLossRules: () => ({ data: { items: [rule] }, isLoading: false }),
  useSellPrices: () => ({ data: { items: [] }, isLoading: false }),
  useGradeGroups: (p: unknown) => { useGradeGroups(p); return { data: { items: [] }, isLoading: false } },
  useCreateValLossRule: () => mutation,
  useUpdateValLossRule: () => mutation,
  useDeleteValLossRule: () => mutation,
  useUpsertSellPrice: () => mutation,
  useAssignGradeGroup: () => mutation,
  useExportErpRules: () => mutation,
}))

import { VallossRulesTab, VallossRuleFormDialog, GradeGroupsTab } from "@/components/finance/erp-rule"

describe("ERP rules page", () => {
  beforeEach(() => { perms.clear(); vi.clearAllMocks() })

  it("hides Create without .create", () => {
    render(<VallossRulesTab />)
    expect(screen.queryByText(/Create rule/)).toBeNull()
  })

  it("shows Create with .create", () => {
    perms.add("finance.cost.erprule.create")
    render(<VallossRulesTab />)
    expect(screen.getByText(/Create rule/)).toBeTruthy()
  })

  it("hides Delete without .delete", () => {
    render(<VallossRulesTab />)
    expect(screen.queryByText("Delete")).toBeNull()
  })

  it("rejects invalid val_loss", async () => {
    render(<VallossRuleFormDialog open onOpenChange={() => {}} rule={null} />)
    fireEvent.change(screen.getByPlaceholderText("e.g., 1.5"), { target: { value: "abc" } })
    fireEvent.click(screen.getByText("Create"))
    await waitFor(() => expect(screen.getByText(/Invalid value/)).toBeTruthy())
    expect(mutation.mutateAsync).not.toHaveBeenCalled()
  })

  it("unassigned toggle passes unassignedOnly: true", () => {
    render(<GradeGroupsTab />)
    fireEvent.click(screen.getByRole("switch"))
    expect(useGradeGroups).toHaveBeenLastCalledWith({ unassignedOnly: true })
  })
})
