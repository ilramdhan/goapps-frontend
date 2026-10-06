/**
 * ERP rule hooks — list query via mocked service, and a mutation invalidating its list key.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const listValLossRules = vi.fn()
const createValLossRule = vi.fn()
vi.mock("@/services/finance/erp-rule-api", () => ({
  listValLossRules: (...a: unknown[]) => listValLossRules(...a),
  createValLossRule: (...a: unknown[]) => createValLossRule(...a),
}))

import { useValLossRules, useCreateValLossRule, erpRuleKeys } from "@/hooks/finance/use-erp-rule"

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}
function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

describe("erp rule hooks", () => {
  beforeEach(() => vi.clearAllMocks())

  it("useValLossRules fetches through the service", async () => {
    listValLossRules.mockResolvedValue({ items: [] })
    const { result } = renderHook(() => useValLossRules({ page: 1 }), { wrapper: makeWrapper(makeClient()) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listValLossRules).toHaveBeenCalledWith({ page: 1 })
  })

  it("create invalidates the valloss list key", async () => {
    createValLossRule.mockResolvedValue({ id: 1 })
    const qc = makeClient()
    const spy = vi.spyOn(qc, "invalidateQueries")
    const { result } = renderHook(() => useCreateValLossRule(), { wrapper: makeWrapper(qc) })
    result.current.mutate({})
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(spy).toHaveBeenCalledWith({ queryKey: erpRuleKeys.valloss() })
  })
})
