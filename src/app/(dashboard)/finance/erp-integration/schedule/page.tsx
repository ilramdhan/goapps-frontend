import { generateMetadata as genMeta } from "@/config/site"
import { ScheduleSettingsForm } from "@/components/finance/erp-integration/schedule-settings-form"

export const metadata = genMeta("ERP Integration Schedule")
export default function ErpSchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integration schedule</h1>
        <p className="text-sm text-muted-foreground">When the ERP cost integration runs automatically.</p>
      </div>
      <ScheduleSettingsForm />
    </div>
  )
}
