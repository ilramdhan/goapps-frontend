// Route RM ratio consistency — denier-derived (DENIER ratio mode) lines.
//
// Covers: type normalizer defaults (old backends render as before), the
// display helper (formula + formatting matching the cost result RM tab),
// the edit panel (read-only for denier lines, editable for INPUT lines),
// the flow edge label, and the BFF GET passthrough + save stripping.
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextRequest } from "next/server"

const getRouteGraph = vi.fn()
const saveRouteGraph = vi.fn()

vi.mock("@/lib/grpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/grpc")>()
  return {
    ...actual,
    createMetadataFromRequest: () => ({ metadata: true }),
    getCostRouteClient: () => ({ getRouteGraph, saveRouteGraph }),
  }
})

import { GET, POST } from "@/app/api/v1/finance/routes/[headId]/graph/route"
import { normalizeGraphForSave } from "@/lib/finance/route-graph-save"
import { formatNumeric } from "@/components/finance/cost-results/format"
import {
  DENIER_RATIO_DISABLED_HINT,
  denierFormula,
  displayRatio,
  isDenierLine,
  isGroupMissingDenier,
} from "@/components/finance/cost-route/rm-ratio-display"
import { RouteGraphEditPanel } from "@/components/finance/cost-route/route-graph-edit-panel"
import { edgeRatioLabel } from "@/components/finance/cost-route/route-graph-flow"
import {
  normalizeCostRouteHead,
  normalizeCostRouteRm,
  normalizeCostRouteSeq,
  type CostRouteRm,
  type CostRouteSeq,
} from "@/types/finance/cost-route"

function rm(over: Partial<CostRouteRm> = {}): CostRouteRm {
  return {
    uid: over.uid ?? "rm-1",
    rmId: 1,
    seqId: 10,
    parentProductSysId: 100,
    rmType: "PRODUCT",
    rmProductSysId: 200,
    routeRmName: "POY 150",
    routeRmRatio: 1,
    ...over,
  }
}

const poy = rm({ uid: "a", ratioSource: "DENIER", denier: 150, computedRatio: 150 / 163.333 })
const spandex = rm({
  uid: "b",
  rmType: "GROUP",
  rmProductSysId: undefined,
  rmGroupCode: "SPX",
  routeRmName: "Spandex",
  ratioSource: "DENIER",
  denier: 13.333,
  computedRatio: 13.333 / 163.333,
})
const inputLine = rm({ uid: "c", rmType: "ITEM", routeRmName: "Oil", routeRmRatio: 0.02, computedRatio: 0.02, ratioSource: "" })

function seqOf(rms: CostRouteRm[]): CostRouteSeq {
  return {
    uid: "s1", seqId: 10, headId: 1, productSysId: 100, productCode: "ACY-1",
    routeLevel: 1, routeSeq: 1, positionX: 0, positionY: 0, rms, rmRatioMode: "DENIER",
  }
}

describe("cost-route normalizers", () => {
  it("defaults computedRatio to routeRmRatio for old backends", () => {
    const n = normalizeCostRouteRm({ rmId: 1, routeRmRatio: 0.5 })
    expect(n.computedRatio).toBe(0.5)
    expect(n.ratioSource).toBe("")
    expect(n.denier).toBeUndefined()
  })

  it("reads snake_case computed fields and keeps a 0 denier ratio", () => {
    const n = normalizeCostRouteRm({
      route_rm_ratio: 1, computed_ratio: 0, ratio_source: "DENIER", denier: 0,
      ratio_note: "missing denier treated as 0",
    })
    expect(n.routeRmRatio).toBe(1)
    expect(n.computedRatio).toBe(0)
    expect(n.ratioSource).toBe("DENIER")
    expect(n.ratioNote).toBe("missing denier treated as 0")
  })

  it("reads rmRatioMode on seq and head", () => {
    expect(normalizeCostRouteSeq({ rm_ratio_mode: "DENIER", rms: [] }).rmRatioMode).toBe("DENIER")
    expect(normalizeCostRouteHead({ rmRatioMode: "INPUT" }).rmRatioMode).toBe("INPUT")
    expect(normalizeCostRouteHead({}).rmRatioMode).toBeUndefined()
  })
})

describe("rm-ratio-display helper", () => {
  it("identifies denier lines", () => {
    expect(isDenierLine(poy)).toBe(true)
    expect(isDenierLine(inputLine)).toBe(false)
  })

  it("displays computedRatio for denier lines with RM-tab formatting", () => {
    expect(displayRatio(poy)).toBe(formatNumeric(150 / 163.333))
    expect(displayRatio(inputLine)).toBe(formatNumeric(0.02))
  })

  it("prefers effectiveRatio for nested-MB rows", () => {
    expect(displayRatio(rm({ originHeadId: 9, effectiveRatio: 0.25, routeRmRatio: 1 }))).toBe(formatNumeric(0.25))
  })

  it("builds the formula from sibling denier lines", () => {
    expect(denierFormula(seqOf([poy, spandex, inputLine]), poy)).toBe("150 / (150 + 13.333) = 0.918")
  })

  it("returns the backend note when present, and '' for non-denier lines", () => {
    const noted = rm({ ratioSource: "DENIER", computedRatio: 0, ratioNote: "Missing DENIER → 0" })
    expect(denierFormula(seqOf([noted]), noted)).toBe("Missing DENIER → 0")
    expect(denierFormula(seqOf([inputLine]), inputLine)).toBe("")
  })
})

describe("isGroupMissingDenier", () => {
  const yarn = { ratioSource: "DENIER" as const }
  const denierSeq = { rmRatioMode: "DENIER" as const, rms: [yarn] as CostRouteRm[] }
  it("flags a GROUP line without denier next to a denier line", () => {
    expect(isGroupMissingDenier(denierSeq, { rmType: "GROUP", ratioSource: "INPUT" })).toBe(true)
  })
  it("does not flag a GROUP line with denier", () => {
    expect(isGroupMissingDenier(denierSeq, { rmType: "GROUP", ratioSource: "DENIER" })).toBe(false)
  })
  it("does not flag a seq without any denier line (chip / additive groups)", () => {
    const chipSeq = { rmRatioMode: "DENIER" as const, rms: [{ ratioSource: "INPUT" }] as CostRouteRm[] }
    expect(isGroupMissingDenier(chipSeq, { rmType: "GROUP", ratioSource: "INPUT" })).toBe(false)
  })
  it("does not flag in INPUT mode", () => {
    expect(isGroupMissingDenier({ ...denierSeq, rmRatioMode: "INPUT" }, { rmType: "GROUP", ratioSource: "INPUT" })).toBe(false)
  })
  it("does not flag PRODUCT lines", () => {
    expect(isGroupMissingDenier(denierSeq, { rmType: "PRODUCT", ratioSource: "INPUT" })).toBe(false)
  })
  it("does not flag when seq is undefined", () => {
    expect(isGroupMissingDenier(undefined, { rmType: "GROUP", ratioSource: "INPUT" })).toBe(false)
  })
})

describe("route graph flow edge label", () => {
  it("marks denier lines with D and uses the computed ratio", () => {
    expect(edgeRatioLabel(poy)).toBe(`×${formatNumeric(150 / 163.333)} D`)
    expect(edgeRatioLabel(inputLine)).toBe(`×${formatNumeric(0.02)}`)
  })
})

describe("RouteGraphEditPanel", () => {
  const seq = seqOf([poy, spandex, inputLine])

  it("rm mode: denier line shows read-only computed ratio + badge + tooltip", async () => {
    render(
      <RouteGraphEditPanel
        mode="rm" seq={seq} rm={poy} rmIdx={0} locked={false}
        onClose={() => {}} onChangeRatio={() => {}} onRemove={() => {}}
      />,
    )
    const input = screen.getByLabelText(/ratio per output unit/i)
    expect(input).toBeDisabled()
    expect(input).toHaveAttribute("title", DENIER_RATIO_DISABLED_HINT)
    expect(screen.getByText("Denier")).toBeInTheDocument()
    expect(screen.getAllByText(formatNumeric(150 / 163.333)).length).toBeGreaterThan(0)
    expect(screen.getByText("150 / (150 + 13.333) = 0.918")).toBeInTheDocument()

    await userEvent.hover(screen.getByTestId("denier-ratio"))
    const hints = await screen.findAllByText(DENIER_RATIO_DISABLED_HINT)
    expect(hints.length).toBeGreaterThan(0)
  })

  it("rm mode: INPUT line stays editable", async () => {
    const onChangeRatio = vi.fn()
    render(
      <RouteGraphEditPanel
        mode="rm" seq={seq} rm={inputLine} rmIdx={2} locked={false}
        onClose={() => {}} onChangeRatio={onChangeRatio} onRemove={() => {}}
      />,
    )
    const input = screen.getByLabelText(/ratio per output unit/i)
    expect(input).toBeEnabled()
    expect(screen.queryByText("Denier")).not.toBeInTheDocument()
    await userEvent.clear(input)
    await userEvent.type(input, "0.5")
    expect(onChangeRatio).toHaveBeenLastCalledWith(0.5)
  })

  it("seq mode: denier rows have no ratio input, INPUT rows do", () => {
    render(
      <RouteGraphEditPanel
        mode="seq" seq={seq} locked={false}
        onClose={() => {}} onChangeRmRatio={() => {}} onRemoveRm={() => {}}
        onAddRm={() => {}} onRemoveStage={() => {}} onOpenInCards={() => {}}
      />,
    )
    expect(screen.getAllByText("Denier")).toHaveLength(2)
    const inputs = screen.getAllByRole("spinbutton")
    expect(inputs).toHaveLength(1)
    expect(inputs[0]).toHaveValue(0.02)
  })
})

describe("BFF /routes/[headId]/graph", () => {
  beforeEach(() => {
    getRouteGraph.mockReset()
    saveRouteGraph.mockReset()
  })

  const params = { params: Promise.resolve({ headId: "7" }) }

  it("GET passes computed ratio fields through", async () => {
    const data = {
      head: { headId: 7, rmRatioMode: "DENIER" },
      seqs: [{ seqId: 1, rmRatioMode: "DENIER", rms: [{ rmId: 1, routeRmRatio: 1, computedRatio: 0.918, ratioSource: "DENIER", denier: 150, ratioNote: "" }] }],
    }
    getRouteGraph.mockResolvedValue({ base: { isSuccess: true }, data })
    const res = await GET(new NextRequest("http://localhost/api/v1/finance/routes/7/graph"), params)
    const body = await res.json()
    expect(body.data).toEqual(data)
    expect(getRouteGraph).toHaveBeenCalledWith({ headId: 7, includeNestedMb: false }, { metadata: true })
  })

  it("save strips read-only fields and never copies computedRatio into routeRmRatio", async () => {
    saveRouteGraph.mockResolvedValue({ base: { isSuccess: true }, data: {} })
    const graph = {
      head: { headId: 7, rmRatioMode: "DENIER" },
      seqs: [{
        seqId: 1, rmRatioMode: "DENIER", rm_ratio_mode: "DENIER",
        rms: [{ rmId: 1, routeRmRatio: 1, computedRatio: 0.918, computed_ratio: 0.918, ratioSource: "DENIER", denier: 150, ratioNote: "x" }],
      }],
    }
    const req = new NextRequest("http://localhost/api/v1/finance/routes/7/graph", {
      method: "POST", body: JSON.stringify({ graph }),
    })
    await POST(req, params)
    const sent = saveRouteGraph.mock.calls[0][0].graph
    expect(sent.head).not.toHaveProperty("rmRatioMode")
    expect(sent.seqs[0]).not.toHaveProperty("rmRatioMode")
    expect(sent.seqs[0]).not.toHaveProperty("rm_ratio_mode")
    const sentRm = sent.seqs[0].rms[0]
    expect(sentRm.routeRmRatio).toBe(1)
    for (const k of ["computedRatio", "computed_ratio", "ratioSource", "denier", "ratioNote"]) {
      expect(sentRm).not.toHaveProperty(k)
    }
  })

  it("normalizeGraphForSave tolerates empty input", () => {
    expect(normalizeGraphForSave(null)).toEqual({ head: {}, seqs: [] })
  })
})
