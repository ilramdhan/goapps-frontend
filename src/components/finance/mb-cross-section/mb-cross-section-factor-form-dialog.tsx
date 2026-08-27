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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

import type { NormalizedMbCrossSectionFactor } from "@/types/finance/mb-cross-section"
import {
  MB_CROSS_SECTION_KNOWN_CODES,
  MB_CROSS_SECTION_OPERATION_OPTIONS,
} from "@/types/finance/mb-cross-section"
import {
  useCreateMbCrossSectionFactor,
  useUpdateMbCrossSectionFactor,
} from "@/hooks/finance/use-mb-cross-section"

const formSchema = z.object({
  fromCode: z.string().min(1, "From code is required").max(10, "Max 10 chars"),
  toCode: z.string().min(1, "To code is required").max(10, "Max 10 chars"),
  factor: z.coerce.number().gt(0, "Factor must be greater than zero"),
  operation: z.enum(["MULTIPLY", "DIVIDE"]),
  note: z.string().max(200, "Max 200 chars"),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

const EMPTY: FormValues = {
  fromCode: "",
  toCode: "",
  factor: 1,
  operation: "MULTIPLY",
  note: "",
  isActive: true,
}

interface MbCrossSectionFactorFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  factor?: NormalizedMbCrossSectionFactor | null
}

export function MbCrossSectionFactorFormDialog({
  open,
  onOpenChange,
  factor,
}: MbCrossSectionFactorFormDialogProps) {
  const isEditing = !!factor
  const createMutation = useCreateMbCrossSectionFactor()
  const updateMutation = useUpdateMbCrossSectionFactor()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        factor
          ? {
              fromCode: factor.fromCode,
              toCode: factor.toCode,
              factor: factor.factor,
              operation: (factor.operation === "DIVIDE" ? "DIVIDE" : "MULTIPLY") as FormValues["operation"],
              note: factor.note || "",
              isActive: factor.isActive ?? true,
            }
          : EMPTY
      )
    }
  }, [open, factor, form])

  const isPending = createMutation.isPending || updateMutation.isPending

  async function onSubmit(values: FormValues) {
    try {
      const data = {
        fromCode: values.fromCode,
        toCode: values.toCode,
        factor: values.factor,
        operation: values.operation,
        note: values.note || "",
        isActive: values.isActive,
      }
      if (isEditing && factor) {
        await updateMutation.mutateAsync({ mbcfId: factor.mbcfId, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      onOpenChange(false)
    } catch {
      // toast handled in hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Conversion Factor" : "Add Conversion Factor"}</DialogTitle>
          <DialogDescription>
            Each row is one directed conversion. The reverse direction is a separate row — the
            operation carries the arithmetic and is not derivable from the factor alone.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="mb-cross-section-factor-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      From Code <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        list="mb-cross-section-factor-known-codes"
                        placeholder="e.g., RND"
                        disabled={isEditing || isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="toCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      To Code <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        list="mb-cross-section-factor-known-codes"
                        placeholder="e.g., TBL"
                        disabled={isEditing || isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <datalist id="mb-cross-section-factor-known-codes">
              {MB_CROSS_SECTION_KNOWN_CODES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>

            <FormField
              control={form.control}
              name="factor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Factor <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="any" min="0" disabled={isPending} />
                  </FormControl>
                  <FormDescription>Must be greater than zero.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="operation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Operation <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select operation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MB_CROSS_SECTION_OPERATION_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
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
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional" disabled={isPending} />
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
                      <FormLabel>Active</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isPending} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="mb-cross-section-factor-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
