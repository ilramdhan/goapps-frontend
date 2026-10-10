import { describe, it, expect, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useCreateCostProductMaster, useUpdateCostProductMaster } from "@/hooks/finance/use-cost-product-master"

function setup() {
  const qc = new QueryClient()
  const spy = vi.spyOn(qc, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  global.fetch = vi.fn().mockResolvedValue({
    json: async () => ({ base: { isSuccess: true }, data: { productSysId: 1, productCode: "P1" } }),
  }) as never
  return { spy, wrapper }
}

describe("product master mutations invalidate CPP queries", () => {
  it("create", async () => {
    const { spy, wrapper } = setup()
    const { result } = renderHook(() => useCreateCostProductMaster(), { wrapper })
    result.current.mutate({} as never)
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["finance", "cost-product-parameter"] }))
  })
  it("update", async () => {
    const { spy, wrapper } = setup()
    const { result } = renderHook(() => useUpdateCostProductMaster(), { wrapper })
    result.current.mutate({ productSysId: 1 } as never)
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["finance", "cost-product-parameter"] }))
  })
})
