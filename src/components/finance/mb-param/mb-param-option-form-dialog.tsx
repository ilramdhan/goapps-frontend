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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

import type { MbParamOption } from "@/types/finance/mb-param"
import { useCreateMbParamOption, useUpdateMbParamOption } from "@/hooks/finance/use-mb-param"

const formSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  numericValue: z.string().min(1, "Numeric value is required"),
  description: z.string().max(200).optional(),
  displayOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface MbParamOptionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mbpId: string
  mbpCode: string
  option?: MbParamOption | null
}

export function MbParamOptionFormDialog({ open, onOpenChange, mbpId, mbpCode, option }: MbParamOptionFormDialogProps) {
  const isEditing = !!option
  const createMutation = useCreateMbParamOption()
  const updateMutation = useUpdateMbParamOption()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: { code: "", numericValue: "", description: "", displayOrder: 0, isActive: true },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        option
          ? {
              code: option.code,
              numericValue: option.numericValue,
              description: option.description || "",
              displayOrder: option.displayOrder ?? 0,
              isActive: option.isActive ?? true,
            }
          : { code: "", numericValue: "", description: "", displayOrder: 0, isActive: true }
      )
    }
  }, [open, option, form])

  const isPending = createMutation.isPending || updateMutation.isPending

  async function onSubmit(values: FormValues) {
    try {
      if (isEditing && option) {
        await updateMutation.mutateAsync({
          mbpId,
          mbpoId: option.mbpoId,
          data: {
            numericValue: values.numericValue,
            description: values.description || "",
            displayOrder: values.displayOrder,
            isActive: values.isActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          mbpId,
          data: {
            mbpCode,
            code: values.code,
            numericValue: values.numericValue,
            description: values.description || "",
            displayOrder: values.displayOrder,
            isActive: values.isActive,
          },
        })
      }
      onOpenChange(false)
    } catch {
      // toast handled in hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Option" : "Add Option"}</DialogTitle>
          <DialogDescription>Picklist option for parameter {mbpCode}.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="mb-param-option-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., FINE" disabled={isEditing || isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numericValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numeric Value <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., 1.5" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Order</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="1" min="0" disabled={isPending} />
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
          <Button type="submit" form="mb-param-option-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
