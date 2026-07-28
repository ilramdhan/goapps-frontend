import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

// Trigger a read-only customer sync from Orion OM_CUSTOMER.
export async function POST(request: NextRequest) {
  return ppcProxy(request, "Failed to sync customers", (c, m) => c.syncCustomers({}, m))
}
