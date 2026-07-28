import { generateMetadata as genMeta } from "@/config/site"
import MastersPageClient from "./masters-page-client"

export const metadata = genMeta("PPC Masters")

export default function MastersPage() {
  return <MastersPageClient />
}
