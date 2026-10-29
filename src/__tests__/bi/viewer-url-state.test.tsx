import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("selectedPeriod=202608"),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/finance/bi/HR_OT_TREND",
}))

import { useUrlState } from "@/lib/hooks"
import { DEFAULT_VIEWER_STATE, type ViewerState } from "@/types/bi"
import { deserializeViewerParam } from "@/components/bi/viewer/viewer-page"

describe("viewer URL state", () => {
  it("keeps selectedPeriod=202608 a string (regression H070: parsed as number, .slice crashed)", () => {
    const { result } = renderHook(() =>
      useUrlState<ViewerState>({ defaultValues: DEFAULT_VIEWER_STATE, deserialize: deserializeViewerParam }),
    )
    expect(result.current[0].selectedPeriod).toBe("202608")
  })
})
