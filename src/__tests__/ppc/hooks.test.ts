// PPC hook query-key hierarchy — ensures ppc-scoped invalidation works.
import { describe, it, expect } from "vitest"
import { machineGroupKeys, lotMasterKeys, overrunThresholdKeys } from "@/hooks/ppc/use-masters"
import { demandKeys } from "@/hooks/ppc/use-demand"
import { planItemKeys } from "@/hooks/ppc/use-plan-item"
import { workOrderKeys } from "@/hooks/ppc/use-work-order"
import { machineKeys } from "@/hooks/ppc/use-machine"

describe("PPC query keys", () => {
  it("all keys are scoped under 'ppc'", () => {
    expect(machineGroupKeys.all[0]).toBe("ppc")
    expect(lotMasterKeys.all[0]).toBe("ppc")
    expect(overrunThresholdKeys.all[0]).toBe("ppc")
    expect(demandKeys.all[0]).toBe("ppc")
    expect(planItemKeys.all[0]).toBe("ppc")
    expect(workOrderKeys.all[0]).toBe("ppc")
    expect(machineKeys.all[0]).toBe("ppc")
  })

  it("resource names are kebab-case", () => {
    expect(machineGroupKeys.all).toEqual(["ppc", "machine-group"])
    expect(demandKeys.all).toEqual(["ppc", "demand"])
    expect(workOrderKeys.all).toEqual(["ppc", "work-order"])
  })

  it("list/detail keys extend the base", () => {
    expect(demandKeys.lists()).toEqual(["ppc", "demand", "list"])
    expect(demandKeys.detail("5")).toEqual(["ppc", "demand", "detail", "5"])
    expect(workOrderKeys.list({ page: 1 })).toEqual(["ppc", "work-order", "list", JSON.stringify({ page: 1 })])
  })

  it("machine bespoke keys follow the same shape", () => {
    expect(machineKeys.lists()).toEqual(["ppc", "machine", "list"])
    expect(machineKeys.detail(9)).toEqual(["ppc", "machine", "detail", 9])
  })
})
