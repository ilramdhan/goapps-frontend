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
import { Switch } from "@/components/ui/switch"
import { usePermissionContext } from "@/providers/permission-provider"

import type { Shade } from "@/types/finance/shade"
import { DEFAULT_SHADE_FORM_VALUES } from "@/types/finance/shade"
import { useCreateShade, useUpdateShade } from "@/hooks/finance/use-shade"

const formSchema = z.object({
  shadeCode: z.string().min(1, "Code is required").max(60),
  shadeName: z.string().min(1, "Name is required").max(300),
  shadeShortName: z.string().max(60).optional(),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface ShadeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shade?: Shade | null
  onSuccess?: () => void
}

export function ShadeFormDialog({ open, onOpenChange, shade, onSuccess }: ShadeFormDialogProps) {
  const isEditing = !!shade
  const createMutation = useCreateShade()
  const updateMutation = useUpdateShade()

  // Defense-in-depth: the dialog is normally only reachable via the Add/Edit
  // triggers in shades-page-client.tsx / shade-detail-dialog.tsx, which are
  // already permission-gated. This second gate on Save itself covers any other
  // path that might open the dialog.
  const { hasPermission } = usePermissionContext()
  const canSubmitPerm = hasPermission(
    isEditing ? "finance.master.shade.update" : "finance.master.shade.create"
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: { ...DEFAULT_SHADE_FORM_VALUES },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        shade
          ? {
              shadeCode: shade.shadeCode,
              shadeName: shade.shadeName,
              shadeShortName: shade.shadeShortName || "",
              isActive: shade.isActive,
            }
          : { ...DEFAULT_SHADE_FORM_VALUES }
      )
    }
  }, [open, shade, form])

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && shade) {
        await updateMutation.mutateAsync({
          id: String(shade.shadeId),
          data: {
            shadeId: shade.shadeId,
            shadeName: values.shadeName,
            shadeShortName: values.shadeShortName || "",
            isActive: values.isActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          shadeCode: values.shadeCode.toUpperCase(),
          shadeName: values.shadeName,
          shadeShortName: values.shadeShortName || "",
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Shade" : "Add Shade"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the shade's display name, short name, or active status."
              : "Create a hand-authored shade (source: MANUAL). This will never be overwritten by an Oracle sync."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="shadeCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Code <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., BLK-01"
                      disabled={isEditing || isPending}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormDescription>Immutable once created — used as the Oracle sync key.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shadeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Jet Black" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shadeShortName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Short Name <span className="text-muted-foreground text-xs">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., BLK" disabled={isPending} />
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
                      <FormDescription>Inactive shades are excluded from new costing.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isPending} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

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
