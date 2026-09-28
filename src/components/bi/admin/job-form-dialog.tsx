"use client"

// ETL Job create/edit dialog.

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { BiJob } from "@/types/bi"
import { useCreateJob, useUpdateJob } from "@/hooks/bi"

const CRON_PRESETS = [
  { label: "Every 6 hours",            value: "0 */6 * * *" },
  { label: "Daily at 08:00 WIB",       value: "0 1 * * *" },
  { label: "Monthly H+5 at 08:00 WIB", value: "0 1 5 * *" },
] as const

const baseJobFormFields = {
  sourceCode:      z.string().min(2),
  targetType:      z.string().min(2),
  scheduleCron:    z.string().min(9, "Enter a valid cron expression"),
  oracleProcedure: z.string().optional(),
  isActive:        z.boolean(),
}

const createSchema = z.object({
  jobName: z.string().min(2).regex(/^[A-Z][A-Z0-9_]*$/, "Uppercase letters, digits, underscore only"),
  ...baseJobFormFields,
})

// Edit mode never renders/submits jobName (see !isEdit guard below), but react-hook-form
// still validates its current value on submit since it's part of form state — a strict
// regex here would block saving jobs whose legacy jobName predates the naming convention.
const updateSchema = z.object({
  jobName: z.string(),
  ...baseJobFormFields,
})

type FormValues = z.infer<typeof createSchema>

export interface JobFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Existing job = edit mode; undefined/null = create mode. */
  job?: BiJob | null
}

export function JobFormDialog({ open, onOpenChange, job }: JobFormDialogProps) {
  const isEdit = Boolean(job)
  const createJob = useCreateJob()
  const updateJob = useUpdateJob()
  const [cronPreset, setCronPreset] = useState("")

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? updateSchema : createSchema),
    defaultValues: {
      jobName:         job?.jobName ?? "",
      sourceCode:      job?.sourceCode ?? "ERP_ORACLE",
      targetType:      job?.targetType ?? "MIS",
      scheduleCron:    job?.scheduleCron ?? "0 */6 * * *",
      oracleProcedure: job?.oracleProcedure ?? "",
      isActive:        job?.isActive ?? true,
    },
  })

  const isPending = createJob.isPending || updateJob.isPending

  // Reset form when job prop changes (e.g. opening edit dialog for a different job).
  // useForm defaultValues only runs on initial mount — without this reset, editing
  // a job after the dialog was previously opened shows stale/empty values and
  // Zod validation fails silently because jobName = "" (hidden in edit mode).
  useEffect(() => {
    reset({
      jobName:         job?.jobName ?? "",
      sourceCode:      job?.sourceCode ?? "ERP_ORACLE",
      targetType:      job?.targetType ?? "MIS",
      scheduleCron:    job?.scheduleCron ?? "0 */6 * * *",
      oracleProcedure: job?.oracleProcedure ?? "",
      isActive:        job?.isActive ?? true,
    })
  }, [job, reset])

  const onSubmit = async (values: FormValues) => {
    if (isEdit && job) {
      await updateJob.mutateAsync({
        id: job.jobId,
        scheduleCron:    values.scheduleCron,
        oracleProcedure: values.oracleProcedure,
        isActive:        values.isActive,
      })
    } else {
      await createJob.mutateAsync({
        jobName:         values.jobName,
        sourceCode:      values.sourceCode,
        targetType:      values.targetType,
        scheduleCron:    values.scheduleCron,
        oracleProcedure: values.oracleProcedure,
        isActive:        values.isActive,
      })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit: ${job?.jobName ?? ""}` : "New ETL Job"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isEdit && (
            <div className="space-y-1">
              <Label>Job Name</Label>
              <Input
                {...register("jobName")}
                placeholder="ETL_MIS_EBITDA"
                className="uppercase"
              />
              {errors.jobName && (
                <p className="text-xs text-destructive">{errors.jobName.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Source Code</Label>
              <Input
                {...register("sourceCode")}
                placeholder="ERP_ORACLE"
                disabled={isEdit}
              />
              {errors.sourceCode && (
                <p className="text-xs text-destructive">{errors.sourceCode.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Target Type</Label>
              <Input
                {...register("targetType")}
                placeholder="MIS"
                disabled={isEdit}
              />
              {errors.targetType && (
                <p className="text-xs text-destructive">{errors.targetType.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Cron Schedule</Label>
            <div className="flex gap-2">
              <Input
                {...register("scheduleCron")}
                placeholder="0 */6 * * *"
                className="flex-1 font-mono text-sm"
              />
              <select
                value={cronPreset}
                onChange={(e) => {
                  setCronPreset(e.target.value)
                  if (e.target.value) setValue("scheduleCron", e.target.value)
                }}
                className="rounded border border-border bg-background px-2 text-xs"
              >
                <option value="">Preset</option>
                {CRON_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.scheduleCron && (
              <p className="text-xs text-destructive">{errors.scheduleCron.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Oracle Procedure (optional)</Label>
            <Input
              {...register("oracleProcedure")}
              placeholder="SP_DASHBOARD_MIS_EBITDA_REFRESH"
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={watch("isActive")}
              onCheckedChange={(v) => setValue("isActive", v)}
            />
            <Label>Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
