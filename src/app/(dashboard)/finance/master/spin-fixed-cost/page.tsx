import { generateMetadata as genMeta } from "@/config/site"
import SpinFixedCostPageClient from "./spin-fixed-cost-page-client"

export const metadata = genMeta("Spin Fixed Cost")

export default function SpinFixedCostPage() {
  return <SpinFixedCostPageClient />
}
