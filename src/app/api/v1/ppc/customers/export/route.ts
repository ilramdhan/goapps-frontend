import { NextRequest } from "next/server"
import { ppcProxy, qStr, qInt } from "../../_lib/proxy"

// GET /api/v1/ppc/customers/export - Export the customer master to Excel.
//
// The gRPC response carries fileContent as a Uint8Array, which JSON-serializes
// to an object the ts-proto parser cannot read. Re-encode to base64, which is
// what `bytesFromBase64` expects on the client.
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to export customers", async (c, m) => {
    const response = await c.exportCustomers(
      {
        search: qStr(sp, "search"),
        activeFilter: qInt(sp, "activeFilter", 0, "active_filter"),
        customerSource: qStr(sp, "customerSource", "customer_source"),
      },
      m
    )
    return {
      base: response.base,
      fileContent: Buffer.from(response.fileContent).toString("base64"),
      fileName: response.fileName,
    }
  })
}
