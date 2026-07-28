import { generateMetadata as genMeta } from "@/config/site"
import MorningReviewClient from "./morning-review-client"

export const metadata = genMeta("Morning Review")

export default function MorningReviewPage() {
  return <MorningReviewClient />
}
