/**
 * Submit and Approve on MbRecipeActionBar are gated on the same codes the backend
 * checks (SubmitMBHead → finance.mb.head.submit, ApproveMBHead → finance.mb.head.approve),
 * so a drafter never sees Approve and an approver never sees Submit (IAM 000099 roles).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/hooks/finance/use-mb-head", () => {
  const stub = () => ({ mutate: vi.fn(), isPending: false })
  return {
    useSubmitMBHead: stub,
    useApproveMBHead: stub,
    useRejectMBHead: stub,
    useReturnMBHeadToDraft: stub,
    useUnrevokeMBHead: stub,
    useRequestUnlockMBHead: stub,
    useGrantUnlockMBHead: stub,
    useRejectUnlockMBHead: stub,
  }
})

const mockHasPermission = vi.fn<(code: string) => boolean>(() => false)

vi.mock("@/providers/permission-provider", () => ({
  usePermissionContext: () => ({ hasPermission: mockHasPermission }),
}))

import { MbRecipeActionBar } from "@/components/finance/mb-recipe/mb-recipe-action-bar"
import type { MBHead } from "@/types/finance/mb-head"

const SUBMIT = "finance.mb.head.submit"
const APPROVE = "finance.mb.head.approve"

function renderBar(entryStatus: string, permissions: string[]) {
  mockHasPermission.mockImplementation((code: string) => permissions.includes(code))
  const mbHead = { mbhId: "11111111-1111-1111-1111-111111111111", entryStatus } as unknown as MBHead
  return render(<MbRecipeActionBar mbHead={mbHead} />)
}

describe("MbRecipeActionBar — Submit permission gate", () => {
  beforeEach(() => mockHasPermission.mockReset())

  it("shows Submit on DRAFT for holders of finance.mb.head.submit", () => {
    renderBar("DRAFT", [SUBMIT])
    expect(screen.getByRole("button", { name: /^submit$/i })).toBeInTheDocument()
  })

  it("hides Submit on DRAFT without finance.mb.head.submit", () => {
    const { container } = renderBar("DRAFT", [APPROVE])
    expect(screen.queryByRole("button", { name: /^submit$/i })).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })
})

describe("MbRecipeActionBar — Approve permission gate", () => {
  beforeEach(() => mockHasPermission.mockReset())

  it.each(["SUBMITTED", "UN_APPROVED"])("shows Approve on %s for holders of finance.mb.head.approve", (status) => {
    renderBar(status, [APPROVE])
    expect(screen.getByRole("button", { name: /^approve$/i })).toBeInTheDocument()
  })

  it.each(["SUBMITTED", "UN_APPROVED"])("hides Approve on %s without finance.mb.head.approve", (status) => {
    renderBar(status, [SUBMIT])
    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument()
  })
})
