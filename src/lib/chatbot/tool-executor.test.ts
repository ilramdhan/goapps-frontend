import { describe, it, expect, vi } from "vitest"
import { executeTool } from "./tool-executor"

describe("executeTool", () => {
  it("rejects unknown tool", async () => {
    const result = await executeTool("unknown_tool", {}, "user-id")
    expect(result.error).toBeTruthy()
    expect(result.error).toContain("Unknown tool")
  })

  it("rejects invalid args for get_product_requests", async () => {
    const result = await executeTool("get_product_requests", { limit: 999 }, "user-id")
    expect(result.error).toBeTruthy()
    expect(result.error).toContain("Validation")
  })

  it("accepts valid args for get_product_requests", async () => {
    // Mock fetch so it doesn't actually call the BFF
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [] }),
      }),
    )
    const result = await executeTool("get_product_requests", { limit: 5 }, "user-id")
    expect(result.error).toBeUndefined()
  })
})
