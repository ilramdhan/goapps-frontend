import { generateMetadata as genMeta } from "@/config/site"
import DowntimeReasonsPageClient from "./downtime-reasons-page-client"

export const metadata = genMeta("Downtime Reasons")

export default function DowntimeReasonsPage() {
  return <DowntimeReasonsPageClient />
}
