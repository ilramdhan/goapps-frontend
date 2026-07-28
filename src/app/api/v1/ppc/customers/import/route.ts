import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

// POST /api/v1/ppc/customers/import - Import customers from Excel.
//
// The client posts fileContent as a plain number array (JSON cannot carry a
// Uint8Array); rebuild it before handing the bytes to gRPC.
export async function POST(request: NextRequest) {
  const body = await request.json()
  return ppcProxy(request, "Failed to import customers", (c, m) =>
    c.importCustomers(
      {
        fileContent: new Uint8Array(body.fileContent),
        fileName: body.fileName,
        duplicateAction: body.duplicateAction,
      },
      m
    )
  )
}
