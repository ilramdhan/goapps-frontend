/** RmDenierOverrideTab — rows, preview, permission gate and the duplicate 3-way dialog. */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { render } from "../utils"

import type { RouteGraph } from "@/types/finance/cost-route"
import type { RMDenierOverrideList } from "@/types/finance/rm-denier-override"

const upsert = vi.fn()
const del = vi.fn()
const state: { list: RMDenierOverrideList; perm: boolean; mode: "DENIER" | "INPUT" } = {
  list: { items: [], duplicateProducts: [] },
  perm: true,
  mode: "DENIER",
}

const graph = (): RouteGraph => ({
  head: { headId: 9, productSysId: 10, routingStatus: "COMPLETE", version: 1, lockedBy: "", lockedAt: "", unlockedBy: "", unlockedAt: "", levelCount: 1, rmCount: 3, rmRatioMode: state.mode },
  seqs: [
    {
      uid: "s1", seqId: 1, headId: 9, productSysId: 10, routeLevel: 1, routeSeq: 1, positionX: 0, positionY: 0,
      rms: [
        { uid: "a", rmId: 1, seqId: 1, parentProductSysId: 10, rmType: "PRODUCT", rmProductSysId: 55, rmProductCode: "AA", routeRmRatio: 1, ratioSource: "DENIER", denier: 75, computedRatio: 0.75 },
        { uid: "b", rmId: 2, seqId: 1, parentProductSysId: 10, rmType: "GROUP", rmGroupCode: "SPX", routeRmRatio: 1, ratioSource: "DENIER", denier: 25, computedRatio: 0.25 },
        { uid: "c", rmId: 3, seqId: 1, parentProductSysId: 10, rmType: "ITEM", rmItemCode: "OIL", routeRmRatio: 0.02, ratioSource: "INPUT", computedRatio: 0.02 },
      ],
    },
    // upstream seq of another product: must not produce rows
    {
      uid: "s2", seqId: 2, headId: 9, productSysId: 55, routeLevel: 2, routeSeq: 1, positionX: 0, positionY: 0,
      rms: [{ uid: "x", rmId: 4, seqId: 2, parentProductSysId: 55, rmType: "GROUP", rmGroupCode: "CHIP", routeRmRatio: 1 }],
    },
  ],
})

vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: () => state.perm }),
}))
vi.mock("@/hooks/finance/use-cost-route", () => ({
  useRouteByProduct: () => ({ data: { headId: 9, rmRatioMode: state.mode }, isLoading: false }),
  useRouteGraph: () => ({ data: graph(), isLoading: false }),
}))
vi.mock("@/hooks/finance/use-rm-denier-override", () => ({
  useRMDenierOverrides: () => ({ data: state.list, isLoading: false }),
  useUpsertRMDenierOverride: () => ({ mutateAsync: upsert, isPending: false }),
  useDeleteRMDenierOverride: () => ({ mutateAsync: del, isPending: false }),
}))

import { RmDenierOverrideTab } from "@/components/finance/cost-product-master/rm-denier-override-tab"

const SAVED = {
  id: 1, productSysId: 10, rmType: "PRODUCT" as const, rmProductSysId: 55, rmProductCode: "AA", rmProductName: "",
  rmGroupCode: "", rmGroupName: "", denier: 50, reason: "lama", createdAt: "", createdBy: "", updatedAt: "", updatedBy: "",
}

beforeEach(() => {
  upsert.mockReset().mockResolvedValue({ data: null, appliedProductSysIds: [10] })
  del.mockReset().mockResolvedValue({ deletedCount: 1, appliedProductSysIds: [10] })
  state.list = { items: [], duplicateProducts: [] }
  state.perm = true
  state.mode = "DENIER"
})

async function fillAA(user: ReturnType<typeof userEvent.setup>, denier = "25") {
  await user.type(screen.getByLabelText("Override denier AA"), denier)
  await user.type(screen.getByLabelText("Alasan override AA"), "khusus")
}

describe("RmDenierOverrideTab", () => {
  it("lists only own PRODUCT/GROUP lines and previews the new ratio", async () => {
    const user = userEvent.setup()
    render(<RmDenierOverrideTab productSysId={10} />)
    expect(screen.getByTestId("denier-row-PRODUCT:55")).toBeInTheDocument()
    expect(screen.getByTestId("denier-row-GROUP:SPX")).toBeInTheDocument()
    expect(screen.queryByTestId("denier-row-GROUP:CHIP")).not.toBeInTheDocument()
    expect(screen.queryByText("OIL")).not.toBeInTheDocument()
    await user.type(screen.getByLabelText("Override denier AA"), "25")
    expect(within(screen.getByTestId("denier-row-PRODUCT:55")).getByText("50%")).toBeInTheDocument()
    expect(within(screen.getByTestId("denier-row-GROUP:SPX")).getByText("50%")).toBeInTheDocument()
  })

  it("saves directly (parent only) when there are no duplicates", async () => {
    const user = userEvent.setup()
    render(<RmDenierOverrideTab productSysId={10} />)
    await fillAA(user)
    await user.click(screen.getByRole("button", { name: "Simpan override AA" }))
    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1))
    expect(upsert.mock.calls[0][0]).toMatchObject({
      productSysId: 10, rmType: "PRODUCT", rmProductSysId: 55, denier: 25, reason: "khusus", applyToDuplicates: false,
    })
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("requires a reason", async () => {
    const user = userEvent.setup()
    render(<RmDenierOverrideTab productSysId={10} />)
    await user.type(screen.getByLabelText("Override denier AA"), "25")
    expect(screen.getByRole("button", { name: "Simpan override AA" })).toBeDisabled()
  })

  describe("with duplicates", () => {
    beforeEach(() => {
      state.list = { items: [], duplicateProducts: [{ productSysId: 11, productCode: "A-C1", productName: "" }] }
    })

    it("Ya → applyToDuplicates=true", async () => {
      const user = userEvent.setup()
      render(<RmDenierOverrideTab productSysId={10} />)
      await fillAA(user)
      await user.click(screen.getByRole("button", { name: "Simpan override AA" }))
      const dlg = await screen.findByRole("alertdialog")
      expect(within(dlg).getByText(/A-C1/)).toBeInTheDocument()
      await user.click(within(dlg).getByRole("button", { name: "Ya, terapkan" }))
      await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1))
      expect(upsert.mock.calls[0][0].applyToDuplicates).toBe(true)
    })

    it("Tidak → still saves, parent only", async () => {
      const user = userEvent.setup()
      render(<RmDenierOverrideTab productSysId={10} />)
      await fillAA(user)
      await user.click(screen.getByRole("button", { name: "Simpan override AA" }))
      const dlg = await screen.findByRole("alertdialog")
      await user.click(within(dlg).getByRole("button", { name: "Tidak, hanya product ini" }))
      await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1))
      expect(upsert.mock.calls[0][0].applyToDuplicates).toBe(false)
    })

    it("Batal / Escape → aborts", async () => {
      const user = userEvent.setup()
      render(<RmDenierOverrideTab productSysId={10} />)
      await fillAA(user)
      await user.click(screen.getByRole("button", { name: "Simpan override AA" }))
      await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Batal" }))
      await user.click(screen.getByRole("button", { name: "Simpan override AA" }))
      await screen.findByRole("alertdialog")
      await user.keyboard("{Escape}")
      await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
      expect(upsert).not.toHaveBeenCalled()
    })

    it("delete goes through the same choice", async () => {
      state.list = { ...state.list, items: [SAVED] }
      const user = userEvent.setup()
      render(<RmDenierOverrideTab productSysId={10} />)
      expect(within(screen.getByTestId("denier-row-PRODUCT:55")).getByText("OVERRIDE")).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: "Hapus override AA" }))
      await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Tidak, hanya product ini" }))
      await waitFor(() => expect(del).toHaveBeenCalledTimes(1))
      expect(del.mock.calls[0][0]).toMatchObject({ rmType: "PRODUCT", rmProductSysId: 55, applyToDuplicates: false })
    })
  })

  it("lists overrides whose RM is not in the route as unused", () => {
    state.list = { items: [{ ...SAVED, id: 2, rmType: "GROUP", rmProductSysId: 0, rmProductCode: "", rmGroupCode: "OLD" }], duplicateProducts: [] }
    render(<RmDenierOverrideTab productSysId={10} />)
    const box = screen.getByTestId("denier-unused-GROUP:OLD")
    expect(within(box).getByText("tidak dipakai")).toBeInTheDocument()
    expect(within(box).getByRole("button", { name: "Hapus override OLD" })).toBeInTheDocument()
  })

  it("shows the INPUT-mode banner", () => {
    state.mode = "INPUT"
    render(<RmDenierOverrideTab productSysId={10} />)
    expect(screen.getByText("Mode rasio INPUT: override tidak berlaku")).toBeInTheDocument()
  })

  it("is read-only without finance.product.route.create", () => {
    state.perm = false
    render(<RmDenierOverrideTab productSysId={10} />)
    expect(screen.getByLabelText("Override denier AA")).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Simpan override AA" })).not.toBeInTheDocument()
  })

  it("highlights the deep-linked row", () => {
    render(<RmDenierOverrideTab productSysId={10} highlightRm="GROUP:SPX" />)
    expect(screen.getByTestId("denier-row-GROUP:SPX").className).toMatch(/ring-2/)
    expect(screen.getByTestId("denier-row-PRODUCT:55").className).not.toMatch(/ring-2/)
  })
})
