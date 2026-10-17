import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { RmTab } from "@/components/finance/cost-results/breakdown/rm-tab"
import { RouteGraphEditPanel } from "@/components/finance/cost-route/route-graph-edit-panel"
import { edgeRatioLabel } from "@/components/finance/cost-route/route-graph-flow"
import type { CostRouteRm, CostRouteSeq } from "@/types/finance/cost-route"

const base = { rmType: "GROUP", refCode: "A", refLabel: "L", shadeCode: "", unitCost: "1", ratio: "0.5", contribution: "1", routeLevel: 1, denier: 40, ratioSource: "DENIER" }

describe("RmTab OVERRIDE badge", () => {
  it("shows only when denierSource is OVERRIDE", () => {
    const { rerender } = render(<RmTab rows={[{ ...base, denierSource: "OVERRIDE" }]} />)
    expect(screen.getByTestId("denier-override-badge")).toBeTruthy()
    rerender(<RmTab rows={[{ ...base, denierSource: "MASTER" }]} />)
    expect(screen.queryByTestId("denier-override-badge")).toBeNull()
    rerender(<RmTab rows={[{ ...base }]} />)
    expect(screen.queryByTestId("denier-override-badge")).toBeNull()
  })
})

function mk(rm: Partial<CostRouteRm>) {
  const full = { uid: "r1", rmId: 1, seqId: 1, parentProductSysId: 7, rmType: "PRODUCT", rmProductSysId: 99, routeRmRatio: 1, ...rm } as CostRouteRm
  const seq = { uid: "s1", productSysId: 7, rms: [full] } as unknown as CostRouteSeq
  return { full, seq }
}

function panel(rm: Partial<CostRouteRm>) {
  const { full, seq } = mk(rm)
  return render(
    <TooltipProvider>
      <RouteGraphEditPanel mode="rm" seq={seq} rm={full} rmIdx={0} locked={false} onClose={() => {}} onChangeRatio={() => {}} onRemove={() => {}} />
    </TooltipProvider>,
  )
}

describe("route RM panel override link", () => {
  it("links PRODUCT RM to Denier RM tab", () => {
    panel({})
    expect(screen.getByTestId("denier-override-link").getAttribute("href")).toBe(
      "/finance/product-master/7?tab=denier-rm&rm=PRODUCT%3A99",
    )
    expect(screen.queryByTestId("denier-override-badge")).toBeNull()
  })
  it("no link for ITEM", () => {
    panel({ rmType: "ITEM", rmProductSysId: undefined, rmItemCode: "X" })
    expect(screen.queryByTestId("denier-override-link")).toBeNull()
  })
})

describe("edgeRatioLabel", () => {
  it("is unchanged for non-overridden and adds D* when overridden", () => {
    const { full } = mk({ rmType: "ITEM" })
    expect(edgeRatioLabel(full)).not.toContain("D")
  })
})
