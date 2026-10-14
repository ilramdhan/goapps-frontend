// Route editor save flow — regression for "changing the ratio in the modal
// isn't saved / no Save button".
//
// Root cause: the ratio inputs were controlled/committing only values > 0 on
// every keystroke, so typing a ratio below 1 ("0" → "0." → "0.5") was
// rejected mid-way (and, for the stage panel's controlled input, snapped back
// to the old value) — the edit never reached the editor state, the dirty flag
// never flipped, and "Save draft" never appeared or saved the old value.
// After a successful save the editor also kept its stale local copy forever.
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock("sonner", () => ({
  toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) },
}))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))
// Stand-in for React Flow (needs layout APIs jsdom lacks): one button per
// stage + RM edge wired to the same click callbacks the real canvas uses.
vi.mock("@/components/finance/cost-route/route-graph-flow", () => ({
  RouteGraphFlow: ({
    graph,
    onStageClick,
    onEdgeClick,
  }: {
    graph: import("@/types/finance/cost-route").RouteGraph
    onStageClick?: (uid: string) => void
    onEdgeClick?: (uid: string) => void
  }) => (
    <div>
      {graph.seqs.map((s) => (
        <div key={s.uid}>
          <button onClick={() => onStageClick?.(s.uid)}>stage {s.productCode}</button>
          {s.rms.map((r) => (
            <button key={r.uid} onClick={() => onEdgeClick?.(r.uid)}>
              edge {r.routeRmName} ×{r.routeRmRatio}
            </button>
          ))}
        </div>
      ))}
    </div>
  ),
}))
vi.mock("@/components/finance/calc-jobs/calculate-button", () => ({ CalculateButton: () => null }))
vi.mock("@/components/finance/cost-route/linked-requests-sheet", () => ({ LinkedRequestsSheet: () => null }))
vi.mock("@/components/finance/cost-route/duplicate-route-dialog", () => ({ DuplicateRouteDialog: () => null }))

import { RouteGraphEditor } from "@/components/finance/cost-route/route-graph-editor"
import { TooltipProvider } from "@/components/ui/tooltip"

type RawGraph = {
  head: Record<string, unknown>
  seqs: { seqId: number; rms: Record<string, unknown>[]; [k: string]: unknown }[]
}

function serverGraph(status = "DRAFT"): RawGraph {
  return {
    head: { headId: 7, productSysId: 100, productCode: "ACY-1", routingStatus: status, version: 1 },
    seqs: [
      {
        seqId: 10, headId: 7, productSysId: 100, productCode: "ACY-1", routeLevel: 1, routeSeq: 1,
        rms: [
          { rmId: 1, seqId: 10, rmType: "GROUP", rmGroupCode: "OIL", routeRmName: "Oil", routeRmRatio: 1, effectiveRatio: 1 },
          {
            rmId: 2, seqId: 10, rmType: "PRODUCT", rmProductSysId: 200, routeRmName: "POY", routeRmRatio: 1,
            computedRatio: 0.9, ratioSource: "DENIER", denier: 150,
          },
        ],
      },
    ],
  }
}

let db: RawGraph
let failSave: string | null
const saves: RawGraph[] = []
const completes: number[] = []

function json(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } }))
}

beforeEach(() => {
  vi.clearAllMocks()
  db = serverGraph()
  failSave = null
  saves.length = 0
  completes.length = 0
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      if (url.includes("/graph") && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { graph: RawGraph }
        saves.push(body.graph)
        if (failSave) return json({ base: { isSuccess: false, message: failSave } })
        // Persist what was sent (ratio per rmId) like the real SaveGraph.
        for (const s of db.seqs) {
          for (const r of s.rms) {
            const sent = body.graph.seqs.flatMap((x) => x.rms).find((x) => x.rmId === r.rmId)
            if (sent) r.routeRmRatio = sent.routeRmRatio
          }
        }
        return json({ base: { isSuccess: true }, data: db })
      }
      if (url.includes("/graph")) return json({ base: { isSuccess: true }, data: db })
      if (url.includes("/complete")) {
        completes.push(Number(url.match(/routes\/(\d+)/)?.[1]))
        db.head.routingStatus = "COMPLETE"
        return json({ base: { isSuccess: true }, data: db.head })
      }
      return json({ base: { isSuccess: true }, data: [] })
    }),
  )
})

function renderEditor() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  )
  return render(<RouteGraphEditor headId={7} />, { wrapper: Wrapper })
}

describe("RouteGraphEditor ratio save flow", () => {
  it("edge panel: typing a ratio below 1 updates state, shows Save draft and persists routeRmRatio", async () => {
    const user = userEvent.setup()
    renderEditor()
    await user.click(await screen.findByRole("button", { name: /edge Oil/ }))

    const input = screen.getByLabelText(/ratio per output unit/i)
    await user.clear(input)
    await user.type(input, "0.25")
    expect(input).toHaveValue(0.25)

    const save = await screen.findByRole("button", { name: /save draft/i })
    await user.click(save)

    await waitFor(() => expect(saves).toHaveLength(1))
    const oil = saves[0].seqs[0].rms.find((r) => r.rmId === 1)!
    expect(oil.routeRmRatio).toBe(0.25)
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Route graph saved"))
    // Reload shows the persisted value and the local copy is dropped.
    expect(await screen.findByRole("button", { name: "edge Oil ×0.25" })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole("button", { name: /save draft/i })).not.toBeInTheDocument())
  })

  it("stage panel: INPUT row ratio is editable below 1, denier row stays read-only", async () => {
    const user = userEvent.setup()
    renderEditor()
    await user.click(await screen.findByRole("button", { name: /stage ACY-1/ }))

    const inputs = screen.getAllByRole("spinbutton")
    expect(inputs).toHaveLength(1) // denier POY line has no input
    expect(screen.getByText("Denier")).toBeInTheDocument()

    await user.clear(inputs[0])
    await user.type(inputs[0], "0.05")
    expect(inputs[0]).toHaveValue(0.05)

    await user.click(await screen.findByRole("button", { name: /save draft/i }))
    await waitFor(() => expect(saves).toHaveLength(1))
    const sent = saves[0].seqs[0].rms
    expect(sent.find((r) => r.rmId === 1)!.routeRmRatio).toBe(0.05)
    // Denier line keeps its stored ratio; computed value never leaks into it.
    expect(sent.find((r) => r.rmId === 2)!.routeRmRatio).toBe(1)
  })

  it("denier edge panel input is disabled", async () => {
    const user = userEvent.setup()
    renderEditor()
    await user.click(await screen.findByRole("button", { name: /edge POY/ }))
    expect(screen.getByLabelText(/ratio per output unit/i)).toBeDisabled()
  })

  it("surfaces a save error as a toast and keeps the edit for retry", async () => {
    const user = userEvent.setup()
    failSave = "route is locked"
    renderEditor()
    await user.click(await screen.findByRole("button", { name: /edge Oil/ }))
    const input = screen.getByLabelText(/ratio per output unit/i)
    await user.clear(input)
    await user.type(input, "2")
    await user.click(await screen.findByRole("button", { name: /save draft/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("route is locked"))
    expect(screen.getByRole("button", { name: /save draft/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "edge Oil ×2" })).toBeInTheDocument()
  })

  it("Mark complete saves pending edits first", async () => {
    const user = userEvent.setup()
    renderEditor()
    await user.click(await screen.findByRole("button", { name: /edge Oil/ }))
    const input = screen.getByLabelText(/ratio per output unit/i)
    await user.clear(input)
    await user.type(input, "3")
    await user.click(screen.getByRole("button", { name: /mark complete/i }))
    await waitFor(() => expect(completes).toEqual([7]))
    expect(saves).toHaveLength(1)
    expect(saves[0].seqs[0].rms.find((r) => r.rmId === 1)!.routeRmRatio).toBe(3)
  })

  it("blur on an invalid draft restores the committed value", async () => {
    const user = userEvent.setup()
    renderEditor()
    await user.click(await screen.findByRole("button", { name: /edge Oil/ }))
    const panel = screen.getByLabelText(/ratio per output unit/i).closest("div")!
    const input = within(panel).getByRole("spinbutton")
    await user.clear(input)
    await user.tab()
    expect(input).toHaveValue(1)
    expect(screen.queryByRole("button", { name: /save draft/i })).not.toBeInTheDocument()
  })
})
