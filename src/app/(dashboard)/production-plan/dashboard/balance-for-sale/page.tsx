import { generateMetadata as genMeta } from "@/config/site"
import BalanceForSaleClient from "./balance-for-sale-client"

export const metadata = genMeta("Balance for Sale")

export default function BalanceForSalePage() {
  return <BalanceForSaleClient />
}
