/**
 * Tests for RequestDetailPanel — verifies that action buttons are shown/hidden
 * correctly based on request status + user permissions + ownership.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CostProductRequest } from "@/types/finance/cost-product-request"

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/hooks/finance/use-cost-product-request", () => {
  const stub = () => ({ mutate: vi.fn(), isPending: false })
  return {
    useSubmitRequest:          stub,
    useStartReview:            stub,
    useReviseRequest:          stub,
    useReopenRequest:          stub,
    useUseExistingCosting:     stub,
    useRejectRequest:          stub,
    useCancelRequest:          stub,
    useCloseRequest:           stub,
    useMarkParameterComplete:  stub,
    useMarkParameterPending:   stub,
    useConfirmRequest:         stub,
    useApproveRequest:         stub,
    useReleaseRequest:         stub,
    useAssignRequest:          stub,
    useRequestHistory:         () => ({ data: [], isLoading: false }),
  }
})

// Provider mocks — replaced per-test via mock implementations
const mockHasPermission = vi.fn((_code: string) => false)
const mockUser = { userId: "user-owner" }

vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: mockHasPermission }),
}))

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ user: mockUser }),
}))

// Child components that fetch data — replace with static stubs to keep tests pure
vi.mock("@/components/common/user-name", () => ({
  UserName: ({ userId }: { userId: string }) => <span>{userId}</span>,
}))

vi.mock("@/components/common/paper-tube-name", () => ({
  PaperTubeName: () => <span>paper-tube</span>,
}))

vi.mock("@/components/finance/calc-jobs/calculate-button", () => ({
  CalculateButton: () => <button>Calculate</button>,
}))

vi.mock("@/components/finance/cost-request-comment", () => ({
  AttachmentsPanel: () => <div>attachments</div>,
  CommentsPanel:    () => <div>comments</div>,
}))

vi.mock(
  "@/components/finance/cost-product-request/routing-panel",
  () => ({ RoutingPanel: () => <div>routing</div> }),
)

vi.mock(
  "@/components/finance/cost-product-request/transition-dialogs",
  () => ({
    ClassificationAndFeasibilityDialog: () => null,
    CloseDialog:                        () => null,
    ConfirmActionDialog:                () => null,
    ReasonDialog:                       () => null,
    UseExistingCostingDialog:           () => null,
  }),
)

vi.mock(
  "@/components/finance/cost-product-request/status-badge",
  () => ({ StatusBadge: ({ status }: { status: string }) => <span>{status}</span> }),
)

// ─── Import under test (after all mocks are registered) ──────────────────────

import { RequestDetailPanel } from "@/components/finance/cost-product-request/request-detail-panel"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseRequest(overrides: Partial<CostProductRequest> = {}): CostProductRequest {
  return {
    requestId: 1,
    requestNo: "CPR-2026-0001",
    requestTypeId: 1,
    title: "Test request",
    description: "",
    customerName: "Acme",
    productClassification: "new",
    urgencyLevel: "medium",
    status: "DRAFT",
    requesterUserId: "user-owner",
    ...overrides,
  }
}

function renderPanel(
  request: CostProductRequest,
  permissions: string[] = [],
  currentUserId = "user-owner",
) {
  mockHasPermission.mockImplementation((code: string) => permissions.includes(code))
  mockUser.userId = currentUserId

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <RequestDetailPanel request={request} onEdit={vi.fn()} />
    </QueryClientProvider>,
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RequestDetailPanel — DRAFT status", () => {
  beforeEach(() => {
    mockHasPermission.mockReset()
  })

  it("shows Edit when owner has create permission", () => {
    renderPanel(baseRequest({ status: "DRAFT" }), ["finance.product.request.create"])
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument()
  })

  it("hides Edit when user is not the owner", () => {
    renderPanel(baseRequest({ status: "DRAFT" }), ["finance.product.request.create"], "user-other")
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
  })

  it("shows Submit when user has submit permission", () => {
    renderPanel(baseRequest({ status: "DRAFT" }), ["finance.product.request.submit"])
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument()
  })

  it("hides Submit when user lacks submit permission", () => {
    renderPanel(baseRequest({ status: "DRAFT" }), [])
    expect(screen.queryByRole("button", { name: /^submit$/i })).not.toBeInTheDocument()
  })

  it("shows Close when owner", () => {
    renderPanel(baseRequest({ status: "DRAFT" }), ["finance.product.request.create"])
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^close$/i })).toBeInTheDocument()
  })
})

describe("RequestDetailPanel — SUBMITTED status", () => {
  beforeEach(() => {
    mockHasPermission.mockReset()
  })

  it("shows Start review when user has review permission", () => {
    renderPanel(baseRequest({ status: "SUBMITTED" }), ["finance.product.request.review"])
    expect(screen.getByRole("button", { name: /start review/i })).toBeInTheDocument()
  })

  it("hides Start review when user lacks review permission", () => {
    renderPanel(baseRequest({ status: "SUBMITTED" }), [])
    expect(screen.queryByRole("button", { name: /start review/i })).not.toBeInTheDocument()
  })

  it("shows Reject when user has reject permission", () => {
    renderPanel(baseRequest({ status: "SUBMITTED" }), ["finance.product.request.reject"])
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument()
  })

  it("hides Reject when user lacks reject permission", () => {
    renderPanel(baseRequest({ status: "SUBMITTED" }), [])
    expect(screen.queryByRole("button", { name: /^reject$/i })).not.toBeInTheDocument()
  })
})

describe("RequestDetailPanel — UNDER_REVIEW status", () => {
  beforeEach(() => {
    mockHasPermission.mockReset()
  })

  it("shows Review & decide when user has resolve permission", () => {
    renderPanel(baseRequest({ status: "UNDER_REVIEW" }), ["finance.product.request.resolve"])
    expect(screen.getByRole("button", { name: /review & decide/i })).toBeInTheDocument()
  })

  it("hides Review & decide when user lacks resolve permission", () => {
    renderPanel(baseRequest({ status: "UNDER_REVIEW" }), [])
    expect(screen.queryByRole("button", { name: /review & decide/i })).not.toBeInTheDocument()
  })

  it("hides Use existing costing even when verifiedClassification is existing (item #1: hidden from UI)", () => {
    renderPanel(
      baseRequest({ status: "UNDER_REVIEW", verifiedClassification: "existing" }),
      ["finance.product.request.resolve"],
    )
    expect(screen.queryByRole("button", { name: /use existing costing/i })).not.toBeInTheDocument()
  })

  it("hides Use existing costing even when productClassification is existing and verifiedClassification is unset", () => {
    renderPanel(
      baseRequest({ status: "UNDER_REVIEW", productClassification: "existing", verifiedClassification: undefined }),
      ["finance.product.request.resolve"],
    )
    expect(screen.queryByRole("button", { name: /use existing costing/i })).not.toBeInTheDocument()
  })

  it("hides Use existing costing when classification is new", () => {
    renderPanel(
      baseRequest({ status: "UNDER_REVIEW", productClassification: "new", verifiedClassification: undefined }),
      ["finance.product.request.resolve"],
    )
    expect(screen.queryByRole("button", { name: /use existing costing/i })).not.toBeInTheDocument()
  })
})

describe("RequestDetailPanel — REJECTED status (terminal)", () => {
  beforeEach(() => {
    mockHasPermission.mockReset()
  })

  it("shows read-only notice", () => {
    renderPanel(baseRequest({ status: "REJECTED" }), [])
    expect(screen.getByText(/revise & resubmit to continue/i)).toBeInTheDocument()
  })

  it("shows Revise button when owner has create permission", () => {
    renderPanel(baseRequest({ status: "REJECTED" }), ["finance.product.request.create"])
    expect(screen.getByRole("button", { name: /revise/i })).toBeInTheDocument()
  })

  it("hides Revise when user is not the owner", () => {
    renderPanel(baseRequest({ status: "REJECTED" }), ["finance.product.request.create"], "other-user")
    expect(screen.queryByRole("button", { name: /revise/i })).not.toBeInTheDocument()
  })

  it("does not show Submit or Start review in terminal state", () => {
    renderPanel(baseRequest({ status: "REJECTED" }), [
      "finance.product.request.submit",
      "finance.product.request.review",
    ])
    expect(screen.queryByRole("button", { name: /^submit$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /start review/i })).not.toBeInTheDocument()
  })
})

describe("RequestDetailPanel — CLOSED status (terminal)", () => {
  beforeEach(() => {
    mockHasPermission.mockReset()
  })

  it("shows read-only notice", () => {
    renderPanel(baseRequest({ status: "CLOSED" }), [])
    expect(screen.getByText(/reopen it to make further changes/i)).toBeInTheDocument()
  })

  it("shows Reopen when user has reopen permission", () => {
    renderPanel(baseRequest({ status: "CLOSED" }), ["finance.product.request.reopen"])
    expect(screen.getByRole("button", { name: /reopen/i })).toBeInTheDocument()
  })

  it("hides Reopen when user lacks reopen permission", () => {
    renderPanel(baseRequest({ status: "CLOSED" }), [])
    expect(screen.queryByRole("button", { name: /reopen/i })).not.toBeInTheDocument()
  })
})

describe("RequestDetailPanel — PARAMETER_PENDING status", () => {
  it("shows Mark parameters complete when user has resolve permission", () => {
    renderPanel(baseRequest({ status: "PARAMETER_PENDING" }), ["finance.product.request.resolve"])
    expect(screen.getByRole("button", { name: /mark parameters complete/i })).toBeInTheDocument()
  })
})
