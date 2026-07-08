/**
 * Tests for FillTrackingDrawer — verifies each task row renders product-code
 * badges for its route level, sourced via useRouteGraph + getProductsAtLevel.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { FillTask } from "@/types/finance/fill-assignment"
import type { RouteGraph } from "@/types/finance/cost-route"

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/hooks/finance/use-fill-assignment", () => ({
  useFillTasks: vi.fn(),
}))

vi.mock("@/hooks/finance/use-cost-route", () => ({
  useRouteGraph: vi.fn(),
}))

vi.mock("@/components/common/user-name", () => ({
  UserName: ({ userId }: { userId: string }) => <span>{userId}</span>,
}))

vi.mock("@/components/common/dept-name", () => ({
  DeptName: ({ deptCode }: { deptCode: string }) => <span>{deptCode}</span>,
}))

// ─── Import under test (after all mocks are registered) ──────────────────────

import { FillTrackingDrawer } from "@/components/finance/fill-assignment/FillTrackingDrawer"
import { useFillTasks } from "@/hooks/finance/use-fill-assignment"
import { useRouteGraph } from "@/hooks/finance/use-cost-route"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseTask(overrides: Partial<FillTask> = {}): FillTask {
  return {
    taskId: 1,
    requestId: 42,
    routeHeadId: 100,
    routeLevel: 1,
    fillerType: "FILL_ACTOR_TYPE_USER",
    fillerValue: "user-1",
    approverType: "FILL_ACTOR_TYPE_USER",
    approverValue: "user-2",
    status: "FILL_TASK_STATUS_ACTIVE",
    claimedBy: "",
    reapproveOnChange: false,
    slaFillHours: 24,
    slaApproveHours: 12,
    totalParams: 5,
    filledParams: 0,
    activatedAt: "",
    approvals: [],
    ...overrides,
  }
}

function baseGraph(): RouteGraph {
  return {
    head: {
      headId: 100,
      productSysId: 10,
      routingStatus: "COMPLETE",
      version: 1,
      lockedBy: "",
      lockedAt: "",
      unlockedBy: "",
      unlockedAt: "",
      levelCount: 1,
      rmCount: 0,
    },
    seqs: [
      {
        uid: "seq-1",
        seqId: 1,
        headId: 100,
        productSysId: 10,
        productCode: "PRD-001",
        productName: "Product One",
        routeLevel: 1,
        routeSeq: 1,
        positionX: 0,
        positionY: 0,
        rms: [],
      },
    ],
  }
}

function renderDrawer() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <FillTrackingDrawer
        open
        onOpenChange={() => {}}
        requestId={42}
        requestNo="REQ-001"
      />
    </QueryClientProvider>,
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FillTrackingDrawer", () => {
  it("renders a product-code badge for the task's route level", () => {
    vi.mocked(useFillTasks).mockReturnValue({
      data: [baseTask()],
      isLoading: false,
    } as unknown as ReturnType<typeof useFillTasks>)

    vi.mocked(useRouteGraph).mockReturnValue({
      data: baseGraph(),
      isLoading: false,
    } as unknown as ReturnType<typeof useRouteGraph>)

    renderDrawer()

    expect(screen.getByText("PRD-001")).toBeInTheDocument()
    expect(useRouteGraph).toHaveBeenCalledWith(100)
  })

  it("renders no product badge when the graph has no product for the task's level", () => {
    vi.mocked(useFillTasks).mockReturnValue({
      data: [baseTask({ routeLevel: 2 })],
      isLoading: false,
    } as unknown as ReturnType<typeof useFillTasks>)

    vi.mocked(useRouteGraph).mockReturnValue({
      data: baseGraph(),
      isLoading: false,
    } as unknown as ReturnType<typeof useRouteGraph>)

    renderDrawer()

    expect(screen.queryByText("PRD-001")).not.toBeInTheDocument()
    expect(screen.getByText("Level 2")).toBeInTheDocument()
  })

  it("shows the loading skeleton unchanged while tasks are loading", () => {
    vi.mocked(useFillTasks).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useFillTasks>)

    vi.mocked(useRouteGraph).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useRouteGraph>)

    renderDrawer()

    expect(screen.getByText("Loading tasks…")).toBeInTheDocument()
  })

  it("shows the empty state unchanged when there are no tasks", () => {
    vi.mocked(useFillTasks).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useFillTasks>)

    vi.mocked(useRouteGraph).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useRouteGraph>)

    renderDrawer()

    expect(screen.getByText("No fill tasks yet")).toBeInTheDocument()
  })
})
