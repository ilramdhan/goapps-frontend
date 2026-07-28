import { generateMetadata as genMeta } from "@/config/site"
import DashboardIndexClient from "./dashboard-index-client"

export const metadata = genMeta("Production Dashboard")

export default function ProductionDashboardPage() {
  return <DashboardIndexClient />
}
