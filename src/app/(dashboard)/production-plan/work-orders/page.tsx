import { generateMetadata as genMeta } from "@/config/site"
import WorkOrdersPageClient from "./work-orders-page-client"

export const metadata = genMeta("Work Orders")

export default function WorkOrdersPage() {
  return <WorkOrdersPageClient />
}
