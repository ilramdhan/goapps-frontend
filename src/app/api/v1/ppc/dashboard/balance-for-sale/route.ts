import { NextRequest } from "next/server"
import { ppcProxy, qIntOpt, qBoolOpt } from "../../_lib/proxy"

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return ppcProxy(request, "Failed to get balance-for-sale", (c, m) =>
    c.getBalanceForSale(
      {
        cpmProductSysId: qIntOpt(sp, "cpmProductSysId", "cpm_product_sys_id"),
        commodityWatchOnly: qBoolOpt(sp, "commodityWatchOnly"),
      },
      m
    )
  )
}
