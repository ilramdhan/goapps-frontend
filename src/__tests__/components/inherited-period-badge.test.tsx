/**
 * InheritedPeriodBadge + label helper (backlog1 T19).
 */
import { describe, it, expect } from "vitest"
import { screen } from "@testing-library/react"
import { render } from "../utils"

import { InheritedPeriodBadge } from "@/components/finance/rm-pricing/groups/inherited-period-badge"
import {
  inheritedFromPeriodLabel,
  normalizeInheritedFromPeriod,
} from "@/types/finance/rm-group"

describe("inheritedFromPeriodLabel", () => {
  it("returns null for an exact period row", () => {
    expect(inheritedFromPeriodLabel("")).toBeNull()
    expect(inheritedFromPeriodLabel(undefined)).toBeNull()
    expect(inheritedFromPeriodLabel("  ")).toBeNull()
  })

  it("labels carried-forward and anchor values", () => {
    expect(inheritedFromPeriodLabel("202608")).toBe("Mewarisi nilai periode 202608")
    expect(inheritedFromPeriodLabel("ANCHOR")).toBe("Mewarisi nilai default")
    expect(normalizeInheritedFromPeriod(" anchor ")).toBe("ANCHOR")
  })
})

describe("InheritedPeriodBadge", () => {
  it("renders nothing when not inherited", () => {
    render(<InheritedPeriodBadge inheritedFromPeriod="" />)
    expect(screen.queryByTestId("inherited-period-badge")).toBeNull()
  })

  it("renders the period label when inherited", () => {
    render(<InheritedPeriodBadge inheritedFromPeriod="202608" />)
    expect(screen.getByTestId("inherited-period-badge")).toHaveTextContent(
      "Mewarisi nilai periode 202608",
    )
  })
})
