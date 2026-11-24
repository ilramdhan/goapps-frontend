// CostCalc — bulk approve cost results (by ids or by list filter).
import { NextRequest } from "next/server"
import { handleCostResultBulk } from "@/lib/finance/cost-result-bulk-bff"

export async function POST(request: NextRequest) {
  return handleCostResultBulk(request, "approve")
}
