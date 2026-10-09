"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { Switch } from "@/components/ui/switch"
import { usePermissionContext } from "@/providers/permission-provider"

import type { SuperbaCostSp } from "@/types/finance/superba-cost-sp"
import { DEFAULT_SUPERBA_COST_SP_FORM_VALUES } from "@/types/finance/superba-cost-sp"
import { useCreateSuperbaCostSp, useUpdateSuperbaCostSp } from "@/hooks/finance/use-superba-cost-sp"
import { superbaCostSpFormSchema, type SuperbaCostSpFormValues } from "./schema"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  row?: SuperbaCostSp | null
  onSuccess?: () => void
}

export function SuperbaCostSpFormDialog({ open, onOpenChange, row, onSuccess }: Props) {
  const isEditing = !!row
  const createMutation = useCreateSuperbaCostSp()
  const updateMutation = useUpdateSuperbaCostSp()

  // Defense-in-depth permission gate on Save itself (triggers are gated too).
  const { hasPermission } = usePermissionContext()
  const canSubmitPerm = hasPermission(
    isEditing ? "finance.master.superbacostsp.update" : "finance.master.superbacostsp.create"
  )

  const form = useForm<SuperbaCostSpFormValues>({
    resolver: zodResolver(superbaCostSpFormSchema) as never,
    defaultValues: { ...DEFAULT_SUPERBA_COST_SP_FORM_VALUES },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        row
          ? {
              legacySysId: String(row.legacySysId),
              shadeCode: row.shadeCode,
              colourName: row.colourName,
              oldValue: String(row.oldValue),
              newValue: row.newValue === undefined ? "" : String(row.newValue),
              isActive: row.isActive,
            }
          : { ...DEFAULT_SUPERBA_COST_SP_FORM_VALUES }
      )
    }
  }, [open, row, form])

  const onSubmit = async (values: SuperbaCostSpFormValues) => {
    const newValue = values.newValue.trim() === "" ? undefined : Number(values.newValue)
    try {
      if (isEditing && row) {
        await updateMutation.mutateAsync({
          id: row.id,
          data: {
            id: row.id,
            shadeCode: values.shadeCode,
            colourName: values.colourName,
            oldValue: Number(values.oldValue),
            newValue,
            isActive: values.isActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          legacySysId: Number(values.legacySysId),
          shadeCode: values.shadeCode,
          colourName: values.colourName,
          oldValue: Number(values.oldValue),
          newValue,
          isActive: values.isActive,
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch {
      // toast handled in hook
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Superba Cost SP" : "Add Superba Cost SP"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the shade, colour name or values. A later Sync will overwrite manual edits."
              : "Create a hand-authored row (source: MANUAL)."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="legacySysId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Legacy Sys Id <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="numeric" placeholder="e.g., 20241101895" disabled={isEditing || isPending} />
                  </FormControl>
                  <FormDescription>Immutable once created — it is the sync upsert key.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shadeCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Shade Code <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., MC-0547" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="colourName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Superba Colour Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="oldValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Old Value <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="decimal" disabled={isPending} />
                    </FormControl>
                    <FormDescription>Used as MB cost marketing.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      New Value <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="decimal" disabled={isPending} />
                    </FormControl>
                    <FormDescription>Information only.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>Inactive rows are ignored by costing.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isPending} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !canSubmitPerm}>
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
