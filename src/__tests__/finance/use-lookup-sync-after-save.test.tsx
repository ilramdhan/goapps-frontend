import { describe, it, expect, vi } from "vitest"
import { act, render, renderHook, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

vi.mock("@/components/finance/lookup-sync", () => ({
  LookupUsageBanner: (p: { lookupMasterCode: string; masterKey: string }) => (
    <div data-testid="banner">{p.lookupMasterCode}:{p.masterKey}</div>
  ),
  lookupSyncKeys: { all: ["finance", "lookup-sync"] },
}))

import { useLookupSyncAfterSave } from "@/hooks/finance/use-lookup-sync-after-save"

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

describe("useLookupSyncAfterSave", () => {
  it("renders nothing until a key is saved, then shows the banner for that key", () => {
    const { result } = renderHook(() => useLookupSyncAfterSave("MACHINE"), { wrapper })
    expect(result.current.notice).toBeNull()

    act(() => result.current.onSaved(""))
    expect(result.current.notice).toBeNull()

    act(() => result.current.onSaved("MC01"))
    render(<>{result.current.notice}</>)
    expect(screen.getByTestId("banner").textContent).toBe("MACHINE:MC01")
  })

  it("can be dismissed", () => {
    const { result } = renderHook(() => useLookupSyncAfterSave("PRODUCT_GRADE"), { wrapper })
    act(() => result.current.onSaved("A"))
    const view = render(<>{result.current.notice}</>)
    act(() => screen.getByLabelText("Tutup").click())
    view.rerender(<>{null}</>)
    expect(screen.queryByTestId("banner")).toBeNull()
  })
})
