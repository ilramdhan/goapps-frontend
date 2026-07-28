import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

// POST /api/v1/ppc/lots/sync - Trigger a read-only lot import from the legacy
// Oracle lot master ASPAK.MMSMERGE. The merge preserves PPC-local corrections.
export async function POST(request: NextRequest) {
  return ppcProxy(request, "Failed to sync lots", (c, m) => c.syncLots({}, m))
}
