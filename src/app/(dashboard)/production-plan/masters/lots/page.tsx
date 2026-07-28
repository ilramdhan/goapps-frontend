import { generateMetadata as genMeta } from "@/config/site"
import LotsPageClient from "./lots-page-client"

export const metadata = genMeta("Lots")

export default function LotsPage() {
  return <LotsPageClient />
}
