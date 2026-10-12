/**
 * ERP period lock card — permission gating, status and reason validation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

let perms: string[] = []
let lockData: { locked: boolean; lockedBy: string; lockedAt: string; reason: string; period: string } | undefined
const lockMutate = vi.fn().mockResolvedValue({})
const unlockMutate = vi.fn().mockResolvedValue({})

vi.mock("@/lib/hooks/use-permission", () => ({
  usePermission: () => ({ hasPermission: (c: string) => perms.includes(c) }),
}))
vi.mock("@/hooks/finance/use-erp-integration", () => ({
  useErpPeriodLock: () => ({ data: lockData }),
  useLockErpPeriod: () => ({ mutateAsync: lockMutate, isPending: false }),
  useUnlockErpPeriod: () => ({ mutateAsync: unlockMutate, isPending: false }),
}))

import { ErpPeriodLockCard } from "@/components/finance/erp-integration/erp-period-lock-card"

describe("ErpPeriodLockCard", () => {
  beforeEach(() => {
    perms = []
    lockData = undefined
    lockMutate.mockClear()
    unlockMutate.mockClear()
  })

  it("shows Lock button when not locked with .lock perm", () => {
    perms = ["finance.cost.erpintegration.lock"]
    render(<ErpPeriodLockCard />)
    expect(screen.getByText("Not locked")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Lock period" })).toBeTruthy()
  })

  it("hides Lock button without perm", () => {
    render(<ErpPeriodLockCard />)
    expect(screen.queryByRole("button", { name: "Lock period" })).toBeNull()
  })

  it("shows Unlock (not Lock) when locked with .unlock perm", () => {
    perms = ["finance.cost.erpintegration.lock", "finance.cost.erpintegration.unlock"]
    lockData = { locked: true, lockedBy: "alice", lockedAt: "2026-08-01", reason: "month end close", period: "202608" }
    render(<ErpPeriodLockCard />)
    expect(screen.getByRole("button", { name: "Unlock period" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Lock period" })).toBeNull()
    expect(screen.getByText(/alice/)).toBeTruthy()
  })

  it("blocks short reason and submits valid reason", async () => {
    perms = ["finance.cost.erpintegration.lock"]
    render(<ErpPeriodLockCard />)
    fireEvent.click(screen.getByRole("button", { name: "Lock period" }))
    const area = screen.getByLabelText("Reason")
    fireEvent.change(area, { target: { value: "short" } })
    const confirm = screen.getAllByRole("button", { name: "Lock period" }).pop()!
    fireEvent.click(confirm)
    expect(await screen.findByText(/at least 10/)).toBeTruthy()
    expect(lockMutate).not.toHaveBeenCalled()

    fireEvent.change(area, { target: { value: "month end close done" } })
    fireEvent.click(screen.getAllByRole("button", { name: "Lock period" }).pop()!)
    await waitFor(() => expect(lockMutate).toHaveBeenCalledTimes(1))
    expect(lockMutate.mock.calls[0][0]).toMatchObject({ reason: "month end close done" })
  })
})
