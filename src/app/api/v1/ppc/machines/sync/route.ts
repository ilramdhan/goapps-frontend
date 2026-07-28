import { NextRequest } from "next/server"
import { ppcProxy } from "../../_lib/proxy"

// Trigger a machine master sync (finance mst_machine + Oracle TXTMACH).
export async function POST(request: NextRequest) {
  return ppcProxy(request, "Failed to sync machines", (c, m) => c.syncMachines({}, m))
}
