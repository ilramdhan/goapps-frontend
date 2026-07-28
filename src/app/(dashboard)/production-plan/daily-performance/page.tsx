import { generateMetadata as genMeta } from "@/config/site"
import DailyPerfClient from "./daily-perf-client"

export const metadata = genMeta("Daily Performance Entry")

export default function DailyPerformanceEntryPage() {
  return <DailyPerfClient />
}
