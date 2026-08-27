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
import { Switch } from "@/components/ui/switch"

import type { NormalizedMbCrossSection } from "@/types/finance/mb-cross-section"
import { MB_CROSS_SECTION_KNOWN_CODES } from "@/types/finance/mb-cross-section"
import { useCreateMbCrossSection, useUpdateMbCrossSection } from "@/hooks/finance/use-mb-cross-section"

const formSchema = z.object({
  code: z.string().min(1, "Code is required").max(10, "Max 10 chars"),
  displayName: z.string().max(50, "Max 50 chars"),
  description: z.string().max(200, "Max 200 chars"),
  displayOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

const EMPTY: FormValues = {
  code: "",
  displayName: "",
  description: "",
  displayOrder: 0,
  isActive: true,
}

interface MbCrossSectionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mbCrossSection?: NormalizedMbCrossSection | null
}

export function MbCrossSectionFormDialog({
  open,
  onOpenChange,
  mbCrossSection,
}: MbCrossSectionFormDialogProps) {
  const isEditing = !!mbCrossSection
  const createMutation = useCreateMbCrossSection()
  const updateMutation = useUpdateMbCrossSection()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        mbCrossSection
          ? {
              code: mbCrossSection.code,
              displayName: mbCrossSection.displayName || "",
              description: mbCrossSection.description || "",
              displayOrder: mbCrossSection.displayOrder ?? 0,
              isActive: mbCrossSection.isActive ?? true,
            }
          : EMPTY
      )
    }
  }, [open, mbCrossSection, form])

  const isPending = createMutation.isPending || updateMutation.isPending

  async function onSubmit(values: FormValues) {
    try {
      const data = {
        // Code is submitted exactly as typed — no case folding, no remapping.
        code: values.code,
        displayName: values.displayName || "",
        description: values.description || "",
        displayOrder: values.displayOrder,
        isActive: values.isActive,
      }
      if (isEditing && mbCrossSection) {
        await updateMutation.mutateAsync({ mbcsId: mbCrossSection.mbcsId, data })
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
          <DialogTitle>{isEditing ? "Edit MB Cross Section" : "Add MB Cross Section"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the cross-section master entry."
              : "Create a new cross-section master entry."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="mb-cross-section-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Code <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      list="mb-cross-section-known-codes"
                      placeholder="e.g., RND"
                      disabled={isEditing || isPending}
                    />
                  </FormControl>
                  <datalist id="mb-cross-section-known-codes">
                    {MB_CROSS_SECTION_KNOWN_CODES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  <FormDescription>
                    Known codes: {MB_CROSS_SECTION_KNOWN_CODES.join(", ")}.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional" disabled={isPending} />
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
          <Button type="submit" form="mb-cross-section-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
