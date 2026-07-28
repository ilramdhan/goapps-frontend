import { generateMetadata as genMeta } from "@/config/site"
import CustomersPageClient from "./customers-page-client"

export const metadata = genMeta("Customers")

export default function CustomersPage() {
  return <CustomersPageClient />
}
