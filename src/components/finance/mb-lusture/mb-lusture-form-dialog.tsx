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

import type { MbLusture } from "@/types/finance/mb-lusture"
import { useCreateMbLusture, useUpdateMbLusture } from "@/hooks/finance/use-mb-lusture"

const formSchema = z.object({
  code: z.string().min(1, "Code is required").max(10),
  displayName: z.string().min(1, "Display name is required").max(100),
  fullDescription: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  displayOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface MbLustureFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mbLusture?: MbLusture | null
}

export function MbLustureFormDialog({ open, onOpenChange, mbLusture }: MbLustureFormDialogProps) {
  const isEditing = !!mbLusture
  const createMutation = useCreateMbLusture()
  const updateMutation = useUpdateMbLusture()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      code: "", displayName: "", fullDescription: "", category: "", displayOrder: 0, isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        mbLusture
          ? {
              code: mbLusture.code,
              displayName: mbLusture.displayName,
              fullDescription: mbLusture.fullDescription || "",
              category: mbLusture.category || "",
              displayOrder: mbLusture.displayOrder ?? 0,
              isActive: mbLusture.isActive ?? true,
            }
          : { code: "", displayName: "", fullDescription: "", category: "", displayOrder: 0, isActive: true }
      )
    }
  }, [open, mbLusture, form])

  const isPending = createMutation.isPending || updateMutation.isPending

  async function onSubmit(values: FormValues) {
    try {
      const data = {
        code: values.code,
        displayName: values.displayName,
        fullDescription: values.fullDescription || "",
        category: values.category || "",
        displayOrder: values.displayOrder,
        isActive: values.isActive,
      }
      if (isEditing && mbLusture) {
        await updateMutation.mutateAsync({ mblId: mbLusture.mblId, data })
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
          <DialogTitle>{isEditing ? "Edit MB Lusture" : "Add MB Lusture"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the lusture master entry." : "Create a new lusture master entry."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="mb-lusture-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., GL" disabled={isEditing || isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Gloss" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional grouping" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fullDescription"
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
          <Button type="submit" form="mb-lusture-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
