import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"

import { useUrlState } from "@/lib/hooks"
import { DEFAULT_VIEWER_STATE, PeriodeGrain, presetsForGrain, type ViewerState } from "@/types/bi"

let search = ""
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/finance/bi/x",
}))

describe("DEFAULT_VIEWER_STATE.comparePeriod", () => {
  beforeEach(() => { search = "" })

  it('defaults to "" so useUrlState keeps it a string', () => {
    expect(DEFAULT_VIEWER_STATE.comparePeriod).toBe("")
    const { result } = renderHook(() => useUrlState<ViewerState>({ defaultValues: DEFAULT_VIEWER_STATE }))
    expect(result.current[0].comparePeriod).toBe("")
  })

  it("reads compare period from the URL as a plain YYYYMM string", () => {
    search = "comparePeriod=202509"
    const { result } = renderHook(() => useUrlState<ViewerState>({ defaultValues: DEFAULT_VIEWER_STATE }))
    expect(result.current[0].comparePeriod).toBe("202509")
  })
})

describe("presetsForGrain", () => {
  const short = ["THIS_WEEK", "LAST_WEEK", "YESTERDAY", "LAST_MONTH"]

  it("offers short-window presets only for DAILY/WEEKLY", () => {
    for (const g of [PeriodeGrain.PERIODE_GRAIN_DAILY, PeriodeGrain.PERIODE_GRAIN_WEEKLY]) {
      for (const p of short) expect(presetsForGrain(g)).toContain(p)
    }
  })

  it("keeps the original global list for other grains", () => {
    for (const g of [PeriodeGrain.PERIODE_GRAIN_MONTHLY, PeriodeGrain.PERIODE_GRAIN_QUARTERLY, PeriodeGrain.PERIODE_GRAIN_YEARLY, undefined]) {
      expect(presetsForGrain(g)).toEqual(["L12M", "L24M", "THIS_YEAR", "THIS_QTR", "THIS_MONTH", "ALL", "CUSTOM"])
    }
  })
})
