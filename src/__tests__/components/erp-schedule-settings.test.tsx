import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

const perms = new Set<string>()
const mutateAsync = vi.fn()
let schedule = { enabled: true, cron: "", runDayOfMonth: 0, runTime: "03:00", source: "settings", nextRunAt: "", validationErrors: [] as string[], mode: "END_OF_MONTH", runDate: "", timezone: "" }

vi.mock("@/lib/hooks/use-permission", () => ({ usePermission: () => ({ hasPermission: (c: string) => perms.has(c) }) }))
vi.mock("@/hooks/finance/use-erp-integration", () => ({
  useErpSchedule: () => ({ data: schedule, isLoading: false }),
  useUpdateErpSchedule: () => ({ mutateAsync, isPending: false }),
}))

import { ScheduleSettingsForm } from "@/components/finance/erp-integration/schedule-settings-form"

describe("ERP schedule settings", () => {
  beforeEach(() => { perms.clear(); vi.clearAllMocks() })

  it("shows only the fields the mode needs", async () => {
    schedule = { ...schedule, mode: "DAY_OF_MONTH", runDayOfMonth: 5 }
    render(<ScheduleSettingsForm />)
    expect(await screen.findByText(/Day of month \(1-31\)/)).toBeTruthy()
    expect(screen.queryByText(/Cron \(6 fields\)/)).toBeNull()
    expect(screen.getByText(/Time \(HH:MM\)/)).toBeTruthy()
  })

  it("is read-only without .update", () => {
    schedule = { ...schedule, mode: "END_OF_MONTH" }
    render(<ScheduleSettingsForm />)
    expect(screen.queryByText("Save")).toBeNull()
    expect(screen.getByText(/Read-only/)).toBeTruthy()
  })

  it("maps a server error to the cron field", async () => {
    perms.add("finance.cost.erpintegration.update")
    schedule = { ...schedule, mode: "CRON", cron: "0 0 3 * * *" }
    mutateAsync.mockRejectedValue(new Error("bad cron spec"))
    render(<ScheduleSettingsForm />)
    await screen.findByText(/Cron \(6 fields\)/)
    fireEvent.click(screen.getByText("Save"))
    await waitFor(() => expect(screen.getByText("bad cron spec")).toBeTruthy())
  })
})
