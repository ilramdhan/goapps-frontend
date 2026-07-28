import { generateMetadata as genMeta } from "@/config/site"
import MachinesPageClient from "./machines-page-client"

export const metadata = genMeta("Machines")

export default function MachinesPage() {
  return <MachinesPageClient />
}
