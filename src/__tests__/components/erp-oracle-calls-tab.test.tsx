import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { OracleCallsTab } from "@/components/finance/erp-integration/detail/tabs/oracle-calls-tab"

vi.mock("@/hooks/finance/use-erp-integration", () => ({
  useErpOracleCalls: () => ({
    data: {
      items: [
        {
          id: 1,
          callType: "PKG_GOAPPS_ADJ.VALUATE_ADJ",
          status: "UNKNOWN",
          actor: "worker",
          startedAt: "2026-07-01T00:00:00Z",
          finishedAt: "",
          durationMs: 1500,
          error: "timeout",
          oraCode: "ORA-03113",
          attempts: 2,
        },
      ],
    },
  }),
}))

describe("OracleCallsTab", () => {
  it("renders ORA code and the UNKNOWN hint", () => {
    render(<OracleCallsTab batchId={1} />)
    expect(screen.getByText("ORA-03113")).toBeTruthy()
    expect(screen.getByText(/never re-called/)).toBeTruthy()
  })
})
