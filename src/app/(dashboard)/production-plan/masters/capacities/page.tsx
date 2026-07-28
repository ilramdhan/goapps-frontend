import { generateMetadata as genMeta } from "@/config/site"
import CapacitiesPageClient from "./capacities-page-client"

export const metadata = genMeta("Product Machine Capacities")

export default function CapacitiesPage() {
  return <CapacitiesPageClient />
}
