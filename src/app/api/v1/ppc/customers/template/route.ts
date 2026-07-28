import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

// GET /api/v1/ppc/customers/template - Download the customer import template.
export async function GET(request: NextRequest) {
  return ppcProxy(request, "Failed to download customer template", async (c, m) => {
    const response = await c.downloadCustomerTemplate({}, m)
    return {
      base: response.base,
      fileContent: Buffer.from(response.fileContent).toString("base64"),
      fileName: response.fileName,
    }
  })
}
