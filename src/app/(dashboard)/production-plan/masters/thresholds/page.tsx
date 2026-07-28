import { generateMetadata as genMeta } from "@/config/site"
import ThresholdsPageClient from "./thresholds-page-client"

export const metadata = genMeta("Overrun Thresholds")

export default function ThresholdsPage() {
  return <ThresholdsPageClient />
}
