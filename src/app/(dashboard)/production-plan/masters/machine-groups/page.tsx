import { generateMetadata as genMeta } from "@/config/site"
import MachineGroupsPageClient from "./machine-groups-page-client"

export const metadata = genMeta("Machine Groups")

export default function MachineGroupsPage() {
  return <MachineGroupsPageClient />
}
