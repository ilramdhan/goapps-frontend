/**
 * C1 (F1 UI) — the Fork dialog gained a mode selector: "Duplicate as new
 * product" (existing behavior) vs "Duplicate route only (same product)".
 *
 * Pinned here:
 *  - default mode is NEW_PRODUCT (existing behavior unchanged)
 *  - switching to SAME_PRODUCT hides the product/param copy checkboxes so an
 *    invalid combination (SAME_PRODUCT + include_upstream/applicability/
 *    values/new_code_prefix) can never be submitted from the UI — the
 *    backend's mutual-exclusion rule is enforced client-side too
 *  - the SAME_PRODUCT submit payload always sends the minimal/neutral flags
 *    (includeRouting=true, everything else false/undefined) regardless of
 *    whatever NEW_PRODUCT-mode state happened to be set before switching
 *  - the NEW_PRODUCT submit payload is unaffected (regression)
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

const mutateAsync = vi.fn().mockResolvedValue({
  newHeadId: 999,
  newProductSysId: 42,
  newProductCode: "CSTPTY26V2",
})

vi.mock("@/hooks/finance/use-duplicate-route", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/finance/use-duplicate-route")>(
    "@/hooks/finance/use-duplicate-route",
  )
  return {
    ...actual,
    useDuplicateRoute: () => ({ mutateAsync, isPending: false }),
  }
})

import { DuplicateRouteDialog } from "@/components/finance/cost-route/duplicate-route-dialog"

beforeEach(() => {
  mutateAsync.mockClear()
  push.mockClear()
})

describe("DuplicateRouteDialog — mode selector (F1)", () => {
  it("defaults to NEW_PRODUCT mode and shows the existing copy-option checkboxes", () => {
    render(<DuplicateRouteDialog open onClose={() => {}} sourceHeadId={12} sourceProductCode="CSTPTY26" />)

    expect(screen.getByRole("radio", { name: /duplicate as new product/i })).toBeChecked()
    expect(screen.getByRole("radio", { name: /duplicate route only \(same product\)/i })).not.toBeChecked()
    expect(screen.getByLabelText(/routing graph \(stages \+ rms\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/upstream products \(recursive\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/capp applicability/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/capp values/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/new code prefix/i)).toBeInTheDocument()
  })

  it("switching to SAME_PRODUCT hides all product/param copy controls — invalid combos are unreachable", async () => {
    const user = userEvent.setup()
    render(<DuplicateRouteDialog open onClose={() => {}} sourceHeadId={12} sourceProductCode="CSTPTY26" />)

    await user.click(screen.getByRole("radio", { name: /duplicate route only \(same product\)/i }))

    expect(screen.queryByLabelText(/routing graph \(stages \+ rms\)/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/upstream products \(recursive\)/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/capp applicability/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/capp values/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/new code prefix/i)).not.toBeInTheDocument()
    expect(screen.getByText(/will be locked and a new draft route/i)).toBeInTheDocument()
  })

  it("switching back to NEW_PRODUCT restores the checkboxes", async () => {
    const user = userEvent.setup()
    render(<DuplicateRouteDialog open onClose={() => {}} sourceHeadId={12} sourceProductCode="CSTPTY26" />)

    await user.click(screen.getByRole("radio", { name: /duplicate route only \(same product\)/i }))
    await user.click(screen.getByRole("radio", { name: /duplicate as new product/i }))

    expect(screen.getByLabelText(/routing graph \(stages \+ rms\)/i)).toBeInTheDocument()
  })

  it("SAME_PRODUCT submit sends targetMode=SAME_PRODUCT with routing-only flags, ignoring prior NEW_PRODUCT UI state", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <DuplicateRouteDialog
        open
        onClose={onClose}
        sourceHeadId={12}
        sourceProductCode="CSTPTY26"
        linkedRequestId={77}
      />,
    )

    // Turn off some NEW_PRODUCT-mode checkboxes before switching, to prove the
    // SAME_PRODUCT payload doesn't leak that stale local state.
    await user.click(screen.getByLabelText(/upstream products \(recursive\)/i))
    await user.click(screen.getByRole("radio", { name: /duplicate route only \(same product\)/i }))
    await user.click(screen.getByRole("button", { name: /^duplicate$/i }))

    expect(mutateAsync).toHaveBeenCalledTimes(1)
    expect(mutateAsync).toHaveBeenCalledWith({
      headId: 12,
      includeRouting: true,
      includeUpstream: false,
      includeApplicability: false,
      includeValues: false,
      newCodePrefix: undefined,
      linkedRequestId: 77,
      targetMode: "SAME_PRODUCT",
    })
    expect(onClose).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith("/finance/routes/999")
  })

  it("NEW_PRODUCT submit still sends the full checkbox/prefix payload (regression)", async () => {
    const user = userEvent.setup()
    render(<DuplicateRouteDialog open onClose={() => {}} sourceHeadId={12} sourceProductCode="CSTPTY26" />)

    await user.type(screen.getByLabelText(/new code prefix/i), "CSTPTY26V2")
    await user.click(screen.getByRole("button", { name: /^duplicate$/i }))

    expect(mutateAsync).toHaveBeenCalledWith({
      headId: 12,
      includeRouting: true,
      includeUpstream: true,
      includeApplicability: true,
      includeValues: true,
      newCodePrefix: "CSTPTY26V2",
      linkedRequestId: undefined,
      targetMode: "NEW_PRODUCT",
    })
  })
})
