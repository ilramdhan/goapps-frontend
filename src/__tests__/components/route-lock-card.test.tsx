/**
 * Tests for RouteLockCard — verifies lock/unlock UI based on route status and param fill state.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CostRouteHead } from "@/types/finance/cost-route"

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/hooks/finance/use-param-summary", () => ({
  useParamSummary: vi.fn(),
}))

vi.mock("@/hooks/finance/use-cost-route", () => ({
  useLockRoute:   () => ({ mutate: vi.fn(), isPending: false }),
  useUnlockRoute: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: () => true, hasAnyRole: () => false }),
}))

vi.mock("@/components/common/user-name", () => ({
  UserName: ({ userId }: { userId: string }) => <span>{userId}</span>,
}))

// ─── Import under test (after all mocks are registered) ──────────────────────

import { RouteLockCard } from "@/components/finance/cost-product-request/route-lock-card"
import { useParamSummary } from "@/hooks/finance/use-param-summary"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseHead(overrides: Partial<CostRouteHead> = {}): CostRouteHead {
  return {
    headId: 1,
    productSysId: 10,
    routingStatus: "COMPLETE",
    version: 1,
    lockedBy: "",
    lockedAt: "",
    unlockedBy: "",
    unlockedAt: "",
    levelCount: 0,
    rmCount: 0,
    ...overrides,
  }
}

function renderCard(head: CostRouteHead) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <RouteLockCard head={head} requestId={42} />
    </QueryClientProvider>,
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RouteLockCard", () => {
  it("shows Lock button when route is COMPLETE and params are filled", () => {
    vi.mocked(useParamSummary).mockReturnValue({
      data: { totalParams: 5, filledParams: 5, products: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useParamSummary>)

    renderCard(baseHead({ routingStatus: "COMPLETE" }))

    const lockBtn = screen.getByRole("button", { name: /lock route/i })
    expect(lockBtn).toBeInTheDocument()
    expect(lockBtn).not.toBeDisabled()
  })

  it("shows Unlock button when route is LOCKED", () => {
    vi.mocked(useParamSummary).mockReturnValue({
      data: { totalParams: 5, filledParams: 5, products: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useParamSummary>)

    renderCard(
      baseHead({
        routingStatus: "LOCKED",
        lockedBy: "some-user-id",
        lockedAt: "2026-06-15T10:00:00Z",
      }),
    )

    expect(screen.getByRole("button", { name: /unlock route/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^lock route$/i })).not.toBeInTheDocument()
  })

  it("opens password dialog when Lock button is clicked", async () => {
    vi.mocked(useParamSummary).mockReturnValue({
      data: { totalParams: 5, filledParams: 5, products: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useParamSummary>)

    renderCard(baseHead({ routingStatus: "COMPLETE" }))

    const lockBtn = screen.getByRole("button", { name: /lock route/i })
    await userEvent.click(lockBtn)

    // The UnlockPasswordDialog opens — assert the dialog and its confirm button are visible
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /lock route/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /confirm lock/i })).toBeInTheDocument()
  })
})
