"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProductCombobox, MachineGroupCombobox } from "@/components/ppc/comboboxes"

import type { OverrunThresholdConfig } from "@/types/ppc/master"
import {
  THRESHOLD_LEVEL_OPTIONS,
  THRESHOLD_UNIT_OPTIONS,
  ThresholdLevel,
  ThresholdUnit,
} from "@/types/ppc/common"
import { useCreateOverrunThreshold, useUpdateOverrunThreshold } from "@/hooks/ppc/use-masters"

const LEVEL_SELECT_OPTIONS = THRESHOLD_LEVEL_OPTIONS.filter(
  (o) => o.value !== ThresholdLevel.THRESHOLD_LEVEL_UNSPECIFIED
)

interface ThresholdFormValues {
  level: string
  refId: string
  thresholdUnit: string
  warningValue: string
  blockValue: string
  notes: string
  isActive: boolean
}

const numericString = z
  .string()
  .refine((v) => v === "" || !Number.isNaN(Number(v)), "Must be a number")

const formSchema = z.object({
  level: z.string().min(1, "Please select a level"),
  refId: z
    .string()
    .refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0), "Must be a non-negative integer"),
  thresholdUnit: z.string().min(1, "Please select a unit"),
  warningValue: numericString,
  blockValue: numericString,
  notes: z.string().max(500, "Max 500 characters"),
  isActive: z.boolean(),
})

interface ThresholdFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threshold?: OverrunThresholdConfig | null
}

export function ThresholdFormDialog({ open, onOpenChange, threshold }: ThresholdFormDialogProps) {
  const isEditing = !!threshold
  const createMutation = useCreateOverrunThreshold()
  const updateMutation = useUpdateOverrunThreshold()

  const form = useForm<ThresholdFormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      level: "",
      refId: "",
      thresholdUnit: "",
      warningValue: "",
      blockValue: "",
      notes: "",
      isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        threshold
          ? {
              level: String(threshold.level || ""),
              refId: String(threshold.refId || 0),
              thresholdUnit: String(threshold.thresholdUnit || ""),
              warningValue: threshold.warningValue || "",
              blockValue: threshold.blockValue || "",
              notes: threshold.notes || "",
              isActive: threshold.isActive ?? true,
            }
          : {
              level: "",
              refId: "",
              thresholdUnit: "",
              warningValue: "",
              blockValue: "",
              notes: "",
              isActive: true,
            }
      )
    }
  }, [open, threshold, form])

  const onSubmit = async (values: ThresholdFormValues) => {
    try {
      if (isEditing && threshold) {
        await updateMutation.mutateAsync({
          id: String(threshold.thresholdId),
          data: {
            thresholdId: threshold.thresholdId,
            thresholdUnit: Number(values.thresholdUnit) as ThresholdUnit,
            warningValue: values.warningValue || "0",
            blockValue: values.blockValue || "0",
            notes: values.notes,
            isActive: values.isActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          level: Number(values.level) as ThresholdLevel,
          refId: values.refId === "" ? 0 : Number(values.refId),
          thresholdUnit: Number(values.thresholdUnit) as ThresholdUnit,
          warningValue: values.warningValue || "0",
          blockValue: values.blockValue || "0",
          notes: values.notes,
        })
      }
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save threshold:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const watchedLevel = Number(form.watch("level")) as ThresholdLevel

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Threshold" : "Add Threshold"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the overrun threshold values. Level and ref id cannot be changed."
              : "Create an overrun threshold config."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditing || isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEVEL_SELECT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="refId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      {watchedLevel === ThresholdLevel.THRESHOLD_LEVEL_PRODUCT ? (
                        <ProductCombobox
                          value={field.value ? Number(field.value) : undefined}
                          onChange={(id) => field.onChange(String(id))}
                          disabled={isEditing || isPending}
                        />
                      ) : watchedLevel === ThresholdLevel.THRESHOLD_LEVEL_MACHINE_GROUP ? (
                        <MachineGroupCombobox
                          value={field.value ? Number(field.value) : undefined}
                          onChange={(id) => field.onChange(String(id))}
                          disabled={isEditing || isPending}
                        />
                      ) : (
                        <Input
                          type="number"
                          {...field}
                          value={field.value || ""}
                          disabled={
                            isEditing ||
                            isPending ||
                            watchedLevel === ThresholdLevel.THRESHOLD_LEVEL_SYSTEM
                          }
                        />
                      )}
                    </FormControl>
                    <FormDescription>
                      Scoped reference per level (0 for System). Product Type / Work Order enter the id.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="thresholdUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {THRESHOLD_UNIT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="warningValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warning Value</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} value={field.value || ""} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="blockValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Block Value</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} value={field.value || ""} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes..."
                      {...field}
                      value={field.value || ""}
                      disabled={isPending}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>Inactive thresholds are not enforced.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                        disabled={isPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
