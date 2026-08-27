/**
 * P10 — the MB Head list table shows the DERIVED check status.
 *
 * User decision, plan §11 item 42 = OPTION (2), SIDE BY SIDE:
 *   * `mbh_check_status_calc` (derived) is the PRIMARY column — table/filter/export.
 *   * `mbh_check_status` (frozen Oracle import trace) is shown ONLY on the detail
 *     page, read-only. It must NOT leak back into the list table.
 *
 * Plan §11 item 44: 207 legacy heads keep `mbh_check_status_calc` NULL PERMANENTLY —
 * there is no backfill. NULL means "never calculated by the application", ⛔ not
 * "no status". Rendering it as "—" or "" would state the wrong fact, so these tests
 * exist to make that regression red.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { MBHeadTable } from "@/components/finance/mb-head/mb-head-table"
import type { MBHead } from "@/types/finance/mb-head"

const row = (over: Partial<MBHead>): MBHead =>
  ({
    mbhId: "id-1",
    mbhMbCosting: "MBH-001",
    mbhMgtName: "Mgt One",
    mbhIsActive: true,
    ...over,
  }) as unknown as MBHead

const renderTable = (data: MBHead[]) =>
  render(<MBHeadTable data={data} onEdit={vi.fn()} onDelete={vi.fn()} />)

describe("MBHeadTable — check status column uses the derived value", () => {
  it("renders mbhCheckStatusCalc, ⛔ not the frozen Oracle mbhCheckStatus", () => {
    renderTable([row({ mbhCheckStatusCalc: "Approved", mbhCheckStatus: "Current" })])

    expect(screen.getByText("Approved")).toBeInTheDocument()
    // The Oracle trace belongs to the detail page only.
    expect(screen.queryByText("Current")).not.toBeInTheDocument()
  })

  it("renders a NULL derived value explicitly as 'Belum dihitung'", () => {
    renderTable([row({ mbhCheckStatusCalc: undefined })])
    expect(screen.getByText(/belum dihitung/i)).toBeInTheDocument()
  })

  it("⛔ never renders a NULL derived value as an em dash, a hyphen or a zero", () => {
    renderTable([row({ mbhCheckStatusCalc: undefined })])

    // Scoped to THIS cell on purpose: other columns legitimately render "—" for
    // their own empty values, so an unscoped query would fail for the wrong reason.
    const cell = screen.getByTestId("mb-head-check-status-calc-cell")
    // A dash would read as "no status"; a 0 would read as a real stored value.
    expect(cell.textContent).not.toMatch(/^[—-]$/)
    expect(cell.textContent).not.toMatch(/^0$/)
    expect(cell.textContent).toMatch(/belum dihitung/i)
  })

  it("shows 'Belum dihitung' even when the Oracle column HAS a value", () => {
    // The exact shape of a legacy row: Oracle supplied a value, the derivation
    // engine never ran. ⛔ The Oracle value must not be used as a fallback — doing
    // so would present a frozen import artefact as if the app had computed it.
    renderTable([row({ mbhCheckStatusCalc: undefined, mbhCheckStatus: "Current" })])

    expect(screen.getByText(/belum dihitung/i)).toBeInTheDocument()
    expect(screen.queryByText("Current")).not.toBeInTheDocument()
  })

  it("treats a blank derived value the same as NULL", () => {
    renderTable([row({ mbhCheckStatusCalc: "   " })])
    expect(screen.getByText(/belum dihitung/i)).toBeInTheDocument()
  })
})
