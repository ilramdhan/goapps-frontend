import { generateMetadata as genMeta } from "@/config/site"
import PlanPageClient from "./plan-page-client"

export const metadata = genMeta("Production Plan")

export default function ProductionPlanPage() {
  return <PlanPageClient />
}
