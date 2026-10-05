"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useErpSchedule, useUpdateErpSchedule } from "@/hooks/finance/use-erp-integration"
import { usePermission } from "@/lib/hooks/use-permission"

const MODES = [
  { value: "END_OF_MONTH", label: "End of month" },
  { value: "START_OF_MONTH", label: "Start of month" },
  { value: "DAY_OF_MONTH", label: "Day of month" },
  { value: "SPECIFIC_DATE", label: "Specific date" },
  { value: "CRON", label: "Cron" },
] as const

const formSchema = z
  .object({
    enabled: z.boolean(),
    mode: z.enum(["END_OF_MONTH", "START_OF_MONTH", "DAY_OF_MONTH", "SPECIFIC_DATE", "CRON"]),
    dayOfMonth: z.string(),
    runDate: z.string(),
    cron: z.string(),
    runTime: z.string(),
    timezone: z.string().max(64),
  })
  .superRefine((v, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message })
    if (v.mode === "DAY_OF_MONTH") {
      const d = Number(v.dayOfMonth)
      if (!Number.isInteger(d) || d < 1 || d > 31) add("dayOfMonth", "Day must be 1-31")
    }
    if (v.mode === "SPECIFIC_DATE" && !/^\d{4}-\d{2}-\d{2}$/.test(v.runDate)) add("runDate", "Date must be YYYY-MM-DD")
    if (v.mode === "CRON") {
      if (v.cron.trim().split(/\s+/).filter(Boolean).length !== 6) add("cron", "Cron needs 6 space-separated fields")
    } else if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(v.runTime)) add("runTime", "Time must be HH:MM")
  })

type FormValues = z.infer<typeof formSchema>

const defaults: FormValues = { enabled: false, mode: "END_OF_MONTH", dayOfMonth: "", runDate: "", cron: "", runTime: "03:00", timezone: "" }

export function ScheduleSettingsForm() {
  const { hasPermission } = usePermission()
  const canEdit = hasPermission("finance.cost.erpintegration.update")
  const { data: schedule, isLoading } = useErpSchedule()
  const update = useUpdateErpSchedule()
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema) as never, defaultValues: defaults })
  const [mode, setMode] = useState<FormValues["mode"]>("END_OF_MONTH")

  useEffect(() => {
    if (!schedule) return
    const m = (schedule.mode || "END_OF_MONTH") as FormValues["mode"]
    setMode(m) // eslint-disable-line react-hooks/set-state-in-effect
    form.reset({
      enabled: schedule.enabled,
      mode: m,
      dayOfMonth: schedule.runDayOfMonth ? String(schedule.runDayOfMonth) : "",
      runDate: schedule.runDate,
      cron: schedule.cron,
      runTime: schedule.runTime || "03:00",
      timezone: schedule.timezone,
    })
  }, [schedule, form])

  async function onSubmit(v: FormValues) {
    try {
      await update.mutateAsync({
        enabled: v.enabled,
        mode: v.mode,
        runDayOfMonth: v.mode === "DAY_OF_MONTH" ? Number(v.dayOfMonth) : 0,
        runDate: v.mode === "SPECIFIC_DATE" ? v.runDate : "",
        cron: v.mode === "CRON" ? v.cron.trim() : "",
        runTime: v.mode === "CRON" ? "" : v.runTime,
        timezone: v.timezone.trim(),
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update schedule"
      if (v.mode === "CRON") form.setError("cron", { message })
      else form.setError("root", { message })
    }
  }

  const rootError = form.formState.errors.root?.message
  const nextRun = schedule?.nextRunAt ? new Date(schedule.nextRunAt).toLocaleString() : "-"

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Schedule settings</CardTitle>
          <CardDescription>The schedule only runs Load demand → Validate. Push and valuation always need a person with typed confirmation.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {!canEdit && <p className="text-sm text-muted-foreground">Read-only: you need the update permission to change the schedule.</p>}
                <FormField control={form.control} name="enabled" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel>Enabled</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="mode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode</FormLabel>
                    <Select value={field.value} onValueChange={(v) => { if (!v) return; field.onChange(v); setMode(v as FormValues["mode"]) }} disabled={!canEdit}>
                      <FormControl><SelectTrigger aria-label="Mode"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {mode === "DAY_OF_MONTH" && (
                  <FormField control={form.control} name="dayOfMonth" render={({ field }) => (
                    <FormItem><FormLabel>Day of month (1-31)</FormLabel><FormControl><Input type="number" min={1} max={31} disabled={!canEdit} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                )}
                {mode === "SPECIFIC_DATE" && (
                  <FormField control={form.control} name="runDate" render={({ field }) => (
                    <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" disabled={!canEdit} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                )}
                {mode === "CRON" && (
                  <FormField control={form.control} name="cron" render={({ field }) => (
                    <FormItem><FormLabel>Cron (6 fields)</FormLabel><FormControl><Input placeholder="0 0 3 * * *" disabled={!canEdit} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                )}
                {mode !== "CRON" && (
                  <FormField control={form.control} name="runTime" render={({ field }) => (
                    <FormItem><FormLabel>Time (HH:MM)</FormLabel><FormControl><Input placeholder="03:00" disabled={!canEdit} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                )}
                <FormField control={form.control} name="timezone" render={({ field }) => (
                  <FormItem><FormLabel>Timezone</FormLabel><FormControl><Input placeholder="Asia/Jakarta" disabled={!canEdit} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                {rootError && <p className="text-sm text-destructive">{rootError}</p>}
                {canEdit && (
                  <Button type="submit" disabled={update.isPending}>
                    {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
                  </Button>
                )}
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Effective schedule</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Source: <span className="font-medium">{schedule?.source || "-"}</span></div>
          <div>Next run: <span className="font-medium">{nextRun}</span></div>
          {(schedule?.validationErrors ?? []).map((e) => <p key={e} className="text-destructive">{e}</p>)}
        </CardContent>
      </Card>
    </div>
  )
}
