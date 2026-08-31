/**
 * MbSpinDetailClient (P5-T1, P5-T2, P5-T3) — the MB Spin detail page.
 *
 * Covers:
 *   - loading: a lightweight "Loading…" PageHeader (mirrors mb-recipe's detail-client)
 *   - populated: identity fields + LDR block + status badge render from real data
 *   - empty/not-found: an <EmptyState>, never a bare "No data" string
 *   - P5-T2 lineage: sibling MB Spins (same mbsMbhId) list with LDR type/value,
 *     since MBSpin has no true parent-spin field (see detail-client.tsx's
 *     "KNOWN LIMITATION" comment) — an empty-siblings message when there are none
 *   - P5-T3 actions: Edit/Delete always shown, Duplicate gated on
 *     finance.yarnmaster.mbspin.create (mirrors mb-spin-table.tsx exactly)
 *
 * The detail/siblings hooks are mocked directly rather than via MSW — same
 * pattern already used by mb-recipe-detail-unlock-reason.test.tsx for its
 * sibling detail-client, which mocks useMBHead rather than hitting the network.
 */
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@/__tests__/utils"
import userEvent from "@testing-library/user-event"

type MbSpinStub = Record<string, unknown>

const mbSpinState: { value: MbSpinStub | null; isLoading: boolean; siblings: MbSpinStub[] } = {
  value: null,
  isLoading: false,
  siblings: [],
}

const permissionState: { hasPermission: (code: string) => boolean } = {
  hasPermission: () => true,
}

const SPIN_ID = "66666666-6666-6666-6666-666666666666"
const MBH_ID = "77777777-7777-7777-7777-777777777777"

const BASE_SPIN: MbSpinStub = {
  mbsId: SPIN_ID,
  mbsMbhId: MBH_ID,
  mbsMgtName: "Spin Mgt Name",
  mbsMbCosting: "MBS-2026-001",
  mbsShadeCode: "SC-1",
  mbsShadeName: "Navy Blue",
  mbsCrossSection: "Round",
  mbsDenier: 150.5,
  mbsFilament: 48,
  mbsDozing: 1.2,
  mbsVsNumber: "VS-1",
  mbsStatus: "Spinning",
  mbsFinalProduct: "FP-1",
  mbsLdrType: "CALCULATED",
  mbsLdrCalculatedPct: 3.5,
  mbsLdrAdjustmentPct: 0.5,
}

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: permissionState.hasPermission }),
}))

vi.mock("@/hooks/finance/use-mb-spin", () => ({
  useMBSpinDetail: () => ({
    data: mbSpinState.value ? { data: mbSpinState.value, isSuccess: true, message: "" } : undefined,
    isLoading: mbSpinState.isLoading,
  }),
  useMBSpinSiblings: () => ({ data: mbSpinState.siblings }),
}))

// Only the identity/lineage/action-bar rendering is under test — the dialogs'
// own behavior is covered by their own test files (mb-spin-form-dialog.test.tsx,
// mb-spin-duplicate-dialog.test.tsx). Stub each with a visible marker so tests
// can assert an "open" dialog rendered, without depending on internal dialog markup.
vi.mock("@/components/finance/mb-spin", () => ({
  MBSpinFormDialog: ({ open }: { open: boolean }) => (open ? <div>edit-dialog-open</div> : null),
  MBSpinDeleteDialog: ({ open, onSuccess }: { open: boolean; onSuccess?: () => void }) =>
    open ? (
      <div>
        delete-dialog-open
        <button onClick={onSuccess}>confirm-delete</button>
      </div>
    ) : null,
  MBSpinDuplicateDialog: ({ open }: { open: boolean }) => (open ? <div>duplicate-dialog-open</div> : null),
}))

import MbSpinDetailClient from "@/app/(dashboard)/finance/yarn-master/mb-spins/[id]/detail-client"

afterEach(() => {
  mbSpinState.value = null
  mbSpinState.isLoading = false
  mbSpinState.siblings = []
  permissionState.hasPermission = () => true
  mockPush.mockClear()
})

describe("MbSpinDetailClient", () => {
  it("renders a loading state while the detail query is in flight", () => {
    mbSpinState.isLoading = true
    render(<MbSpinDetailClient id={SPIN_ID} />)

    expect(screen.getByText("Loading…")).toBeInTheDocument()
  })

  it("renders an EmptyState (not a bare string) when the spin is not found", () => {
    mbSpinState.value = null
    mbSpinState.isLoading = false
    render(<MbSpinDetailClient id={SPIN_ID} />)

    expect(screen.getByText("MB Spin not found")).toBeInTheDocument()
    expect(screen.getByText("The requested MB Spin does not exist.")).toBeInTheDocument()
    expect(screen.getByText(/back to mb spin list/i)).toBeInTheDocument()
  })

  it("renders identity fields, status badge and the LDR block when data is present", () => {
    mbSpinState.value = BASE_SPIN
    render(<MbSpinDetailClient id={SPIN_ID} />)

    // Identity fields
    expect(screen.getAllByText("Spin Mgt Name").length).toBeGreaterThan(0)
    expect(screen.getAllByText("MBS-2026-001").length).toBeGreaterThan(0)
    expect(screen.getByText("SC-1")).toBeInTheDocument()
    expect(screen.getByText("Navy Blue")).toBeInTheDocument()
    expect(screen.getByText("Round")).toBeInTheDocument()
    expect(screen.getByText("150.5")).toBeInTheDocument()
    expect(screen.getByText("48")).toBeInTheDocument()
    expect(screen.getByText("VS-1")).toBeInTheDocument()
    expect(screen.getByText("FP-1")).toBeInTheDocument()

    // Status badge (generic type — free-text mbsStatus)
    expect(screen.getByText("Spinning")).toBeInTheDocument()

    // LDR block: calculated 3.5 + adjustment 0.5 = effective 4
    expect(screen.getByText("3.5%")).toBeInTheDocument()
    expect(screen.getByText("0.5%")).toBeInTheDocument()
    expect(screen.getByText("4%")).toBeInTheDocument()
  })

  it("omits Lusture Code — MBSpin has no mbsLustureCode field (verified against the generated type)", () => {
    mbSpinState.value = BASE_SPIN
    render(<MbSpinDetailClient id={SPIN_ID} />)

    expect(screen.queryByText(/lusture/i)).not.toBeInTheDocument()
  })

  it("omits Dozing — mbsDozing is retired from display (duplicate of LDR), per 2026-08-31 decision", () => {
    mbSpinState.value = BASE_SPIN
    render(<MbSpinDetailClient id={SPIN_ID} />)

    expect(screen.queryByText(/dozing/i)).not.toBeInTheDocument()
  })

  describe("Lineage section (P5-T2)", () => {
    it("shows an empty-siblings message when no other spins share the same MB Head", () => {
      mbSpinState.value = BASE_SPIN
      mbSpinState.siblings = [BASE_SPIN] // hook returns the spin itself too — component filters it out
      render(<MbSpinDetailClient id={SPIN_ID} />)

      expect(screen.getByText("Lineage")).toBeInTheDocument()
      expect(screen.getByText("No other MB Spins under the same MB Head.")).toBeInTheDocument()
    })

    it("lists sibling spins (excluding itself) with their LDR type and effective LDR value", () => {
      mbSpinState.value = BASE_SPIN
      mbSpinState.siblings = [
        BASE_SPIN,
        {
          mbsId: "88888888-8888-8888-8888-888888888888",
          mbsMbhId: MBH_ID,
          mbsMgtName: "Sibling Spin A",
          mbsMbCosting: "MBS-2026-002",
          mbsLdrType: "ACTUAL",
          mbsLdrCalculatedPct: 2,
          mbsLdrAdjustmentPct: 1,
        },
      ]
      render(<MbSpinDetailClient id={SPIN_ID} />)

      expect(screen.getByText("Sibling Spin A")).toBeInTheDocument()
      expect(screen.getByText("MBS-2026-002")).toBeInTheDocument()
      // P7-T2 registered mbsLdrType's three values in status-colors.ts's
      // "generic" registry (previously empty, so it fell back to a raw
      // Title-Case prettify) — the ACTUAL badge now shows this fixed label.
      expect(screen.getByText("Terkunci (Aktual)")).toBeInTheDocument()
      expect(screen.getByText("3%")).toBeInTheDocument() // 2 + 1
      // The spin itself must not appear a second time in the lineage list
      expect(screen.queryByText("No other MB Spins under the same MB Head.")).not.toBeInTheDocument()
    })
  })

  describe("Action buttons & permissions (P5-T3)", () => {
    it("always shows Edit and Delete, regardless of permission", () => {
      permissionState.hasPermission = () => false
      mbSpinState.value = BASE_SPIN
      render(<MbSpinDetailClient id={SPIN_ID} />)

      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument()
    })

    it("hides Duplicate when the user lacks finance.yarnmaster.mbspin.create", () => {
      permissionState.hasPermission = (code) => code !== "finance.yarnmaster.mbspin.create"
      mbSpinState.value = BASE_SPIN
      render(<MbSpinDetailClient id={SPIN_ID} />)

      expect(screen.queryByRole("button", { name: /duplicate/i })).not.toBeInTheDocument()
    })

    it("shows Duplicate when the user holds finance.yarnmaster.mbspin.create", () => {
      permissionState.hasPermission = () => true
      mbSpinState.value = BASE_SPIN
      render(<MbSpinDetailClient id={SPIN_ID} />)

      expect(screen.getByRole("button", { name: /duplicate/i })).toBeInTheDocument()
    })

    it("opens the edit dialog on Edit click", async () => {
      const user = userEvent.setup()
      mbSpinState.value = BASE_SPIN
      render(<MbSpinDetailClient id={SPIN_ID} />)

      await user.click(screen.getByRole("button", { name: /edit/i }))
      expect(screen.getByText("edit-dialog-open")).toBeInTheDocument()
    })

    it("opens the duplicate dialog on Duplicate click", async () => {
      const user = userEvent.setup()
      mbSpinState.value = BASE_SPIN
      render(<MbSpinDetailClient id={SPIN_ID} />)

      await user.click(screen.getByRole("button", { name: /duplicate/i }))
      expect(screen.getByText("duplicate-dialog-open")).toBeInTheDocument()
    })

    it("opens the delete dialog on Delete click and navigates back to the list on success", async () => {
      const user = userEvent.setup()
      mbSpinState.value = BASE_SPIN
      render(<MbSpinDetailClient id={SPIN_ID} />)

      await user.click(screen.getByRole("button", { name: /delete/i }))
      expect(screen.getByText("delete-dialog-open")).toBeInTheDocument()

      await user.click(screen.getByText("confirm-delete"))
      expect(mockPush).toHaveBeenCalledWith("/finance/yarn-master/mb-spins")
    })
  })
})
